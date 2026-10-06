// Shared local OCR input plumbing. No provider selected from file content.
import { PDFDocument } from "pdf-lib";
import { extractHardwareGroupsViaEmbeddedGofaineat } from "./hardware-extraction-vision-dispatch.js";

export async function extractHardwarePage(pdfBuffer, pageNumber, env) {
  if (!pdfBuffer?.byteLength || pdfBuffer.byteLength > 50 * 1024 * 1024) { const e = new Error("PDF input must be between 1 byte and 50 MiB"); e.status = 400; throw e; }
  let pdf;
  try { pdf = await PDFDocument.load(pdfBuffer); } catch { const e = new Error("Invalid or unreadable PDF"); e.status = 400; throw e; }
  const totalPages = pdf.getPageCount();
  if (pageNumber == null && totalPages !== 1) {
    const error = new Error("Select page_number for a multi-page PDF; use the existing per-page extraction workflow");
    error.status = 400;
    throw error;
  }
  const target = pageNumber ?? 1;
  if (!Number.isInteger(target) || target < 1 || target > totalPages) {
    const error = new Error(`Page ${target} out of range (PDF has ${totalPages} pages)`);
    error.status = 400;
    throw error;
  }
  return extractHardwareGroupsViaEmbeddedGofaineat(pdfBuffer, target, totalPages, env);
}

export async function prepareOcrInput(buffer, pageNumber = 1) {
  const bytes = new Uint8Array(buffer);
  if (!bytes.length || bytes.length > 50 * 1024 * 1024) throw new Error("OCR input must be between 1 byte and 50 MiB");
  if (!Number.isInteger(pageNumber) || pageNumber < 1) throw new Error("A positive source page number is required");
  if (bytes[0] === 37 && bytes[1] === 80 && bytes[2] === 68 && bytes[3] === 70) {
    const pdf = await PDFDocument.load(bytes);
    if (pageNumber > pdf.getPageCount()) throw new Error("Source page outside PDF");
    return { buffer: bytes, ocrPage: pageNumber, inputType: "pdf" };
  }
  // Existing OCR Worker accepts JPEG directly. PNG images become a one-page
  // PDF using the already installed pdf-lib; no new renderer/service.
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return { buffer: bytes, ocrPage: 1, inputType: "jpeg" };
  if (bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71) {
    const pdf = await PDFDocument.create();
    const image = await pdf.embedPng(bytes);
    const page = pdf.addPage([image.width, image.height]);
    page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
    return { buffer: await pdf.save(), ocrPage: 1, inputType: "png_as_pdf" };
  }
  throw new Error("Unsupported OCR input: use PDF, JPEG or PNG; no vision fallback is available");
}
