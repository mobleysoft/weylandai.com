import { normalizeManufacturerKey, parseModelString, generateSearchVariants, generateSearchQueries } from "./cps-matching.js";

export var PDF_MAGIC_BYTES = [37, 80, 68, 70];
export var MAX_FILE_SIZE = 50 * 1024 * 1024;
export var DOWNLOAD_TIMEOUT = 3e4;
export async function downloadPdf(url, env2) {
  console.log(`[PDF Validator] Downloading: ${url}`);
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT);
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "SubX-CutSheetBot/1.0 (+https://weylandai.com/bot)",
        "Accept": "application/pdf,*/*"
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        errorCode: "DOWNLOAD_FAILED"
      };
    }
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("pdf") && !url.toLowerCase().endsWith(".pdf")) {
      return {
        success: false,
        error: `Invalid content type: ${contentType}`,
        errorCode: "INVALID_CONTENT_TYPE"
      };
    }
    const contentLength = parseInt(response.headers.get("content-length") || "0");
    if (contentLength > MAX_FILE_SIZE) {
      return {
        success: false,
        error: `File too large: ${(contentLength / 1024 / 1024).toFixed(2)}MB exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`,
        errorCode: "FILE_TOO_LARGE"
      };
    }
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    if (bytes.length < 4) {
      return {
        success: false,
        error: "File too small to be a valid PDF",
        errorCode: "FILE_TOO_SMALL"
      };
    }
    const isPdf = PDF_MAGIC_BYTES.every((byte, i) => bytes[i] === byte);
    if (!isPdf) {
      return {
        success: false,
        error: "Invalid PDF: magic bytes do not match",
        errorCode: "INVALID_PDF_MAGIC"
      };
    }
    console.log(`[PDF Validator] Downloaded ${bytes.length} bytes`);
    return {
      success: true,
      buffer,
      contentType,
      contentLength: bytes.length
    };
  } catch (error4) {
    if (error4.name === "AbortError") {
      return {
        success: false,
        error: "Download timed out after 30 seconds",
        errorCode: "TIMEOUT"
      };
    }
    return {
      success: false,
      error: error4.message,
      errorCode: "DOWNLOAD_ERROR"
    };
  }
}
export async function calculateHash(buffer) {
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = new Uint8Array(hashBuffer);
  return Array.from(hashArray).map((b) => b.toString(16).padStart(2, "0")).join("");
}
export async function checkDuplicate(hash, env2) {
  const discovery = await env2.DB.prepare(`
    SELECT id, status, source_url, created_at
    FROM cut_sheet_discoveries
    WHERE file_hash_sha256 = ? AND status != 'rejected'
    LIMIT 1
  `).bind(hash).first();
  if (discovery) {
    return {
      type: "discovery",
      ...discovery
    };
  }
  const document2 = await env2.DB.prepare(`
    SELECT id, product_id, document_title, verified
    FROM product_documents
    WHERE file_hash_sha256 = ?
    LIMIT 1
  `).bind(hash).first();
  if (document2) {
    return {
      type: "product_document",
      ...document2
    };
  }
  return null;
}
export async function storeInTempStorage(buffer, hash, env2) {
  const key = `temp/cut-sheets/${hash}.pdf`;
  await env2.UPLOADS.put(key, buffer, {
    httpMetadata: {
      contentType: "application/pdf"
    },
    customMetadata: {
      uploadedAt: (/* @__PURE__ */ new Date()).toISOString(),
      source: "cut-sheet-discovery"
    }
  });
  console.log(`[PDF Validator] Stored in temp: ${key}`);
  return key;
}
export async function analyzePdfWithClaude(buffer, component, env2) {
  if (!env2.ANTHROPIC_API_KEY) {
    console.warn("[PDF Validator] No ANTHROPIC_API_KEY, skipping Claude analysis");
    return {
      analyzed: false,
      reason: "API key not configured"
    };
  }
  const bytes = new Uint8Array(buffer);
  const base64 = btoa(String.fromCharCode(...bytes));
  const prompt = `You are analyzing a product cut sheet or specification document for door hardware.

CONTEXT:
- We're looking for: ${component.manufacturer || "Unknown"} model ${component.model || component.catalog_number || "Unknown"}
- Component type: ${component.dhi_category || component.component_type || "Unknown"}

TASK:
Analyze this PDF document and extract the following information. Return ONLY valid JSON, no other text.

{
  "documentType": "cut_sheet|spec_sheet|catalog_page|installation_guide|unknown",
  "manufacturer": "extracted manufacturer name",
  "brandName": "brand if different from manufacturer",
  "modelNumbers": ["array", "of", "model", "numbers"],
  "productName": "full product name/title",
  "productCategory": "lock|hinge|closer|exit_device|weatherstrip|kick_plate|other",
  "specifications": {
    "dimensions": "any dimension info",
    "material": "material composition",
    "finish": "finish options or codes",
    "weight": "weight if specified"
  },
  "certifications": ["UL", "ADA", "ANSI", "etc"],
  "fireRating": "fire rating if specified (e.g., '3-hour')",
  "compliance": ["CBC", "IBC", "other codes"],
  "matchesExpectedProduct": true|false,
  "matchConfidence": 0.0-1.0,
  "matchReason": "brief explanation of why it matches or doesn't match",
  "pageCount": estimated_number_of_pages,
  "documentDate": "date if visible",
  "extractedText": "first 500 chars of relevant text"
}`;
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env2.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-opus-4-5-20251101",
        max_tokens: 2048,
        messages: [{
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: base64
              }
            },
            {
              type: "text",
              text: prompt
            }
          ]
        }]
      })
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[PDF Validator] Claude API error: ${response.status} - ${errorText}`);
      return {
        analyzed: false,
        reason: `API error: ${response.status}`,
        error: errorText
      };
    }
    const result = await response.json();
    const content = result.content?.[0]?.text || "";
    let metadata;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        metadata = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("[PDF Validator] Failed to parse Claude response:", parseError);
      return {
        analyzed: true,
        parseError: true,
        rawResponse: content.substring(0, 500),
        reason: "Failed to parse response"
      };
    }
    console.log(`[PDF Validator] Claude analysis complete: ${metadata.matchesExpectedProduct ? "MATCH" : "NO MATCH"} (${metadata.matchConfidence})`);
    return {
      analyzed: true,
      ...metadata,
      inputTokens: result.usage?.input_tokens,
      outputTokens: result.usage?.output_tokens
    };
  } catch (error4) {
    console.error("[PDF Validator] Claude analysis failed:", error4);
    return {
      analyzed: false,
      reason: error4.message,
      error: error4.toString()
    };
  }
}
export function calculateMatchScore(metadata, component) {
  if (!metadata || !metadata.analyzed) {
    return 0;
  }
  let score = 0;
  let maxScore = 0;
  maxScore += 30;
  if (metadata.manufacturer && component.manufacturer) {
    const mfrMatch = metadata.manufacturer.toLowerCase().includes(component.manufacturer.toLowerCase()) || component.manufacturer.toLowerCase().includes(metadata.manufacturer.toLowerCase());
    if (mfrMatch)
      score += 30;
    else if (metadata.brandName?.toLowerCase().includes(component.manufacturer.toLowerCase()))
      score += 25;
  }
  maxScore += 40;
  const componentModel = (component.model || component.catalog_number || "").toLowerCase();
  if (componentModel && metadata.modelNumbers) {
    for (const model of metadata.modelNumbers) {
      if (model.toLowerCase().includes(componentModel) || componentModel.includes(model.toLowerCase())) {
        score += 40;
        break;
      }
    }
  }
  maxScore += 15;
  const categoryMap = {
    "hinge": ["hinge", "pivot"],
    "lock": ["lock", "lockset", "latch"],
    "closer": ["closer", "door closer"],
    "exit_device": ["exit", "panic", "crash bar"],
    "weatherstrip": ["seal", "weather", "gasket", "threshold"],
    "kick_plate": ["kick", "plate", "protection"]
  };
  const componentType = (component.dhi_category || component.component_type || "").toLowerCase();
  const metadataCategory = (metadata.productCategory || "").toLowerCase();
  if (componentType && metadataCategory) {
    if (componentType.includes(metadataCategory) || metadataCategory.includes(componentType)) {
      score += 15;
    } else {
      for (const [key, aliases] of Object.entries(categoryMap)) {
        if (aliases.some((a) => componentType.includes(a)) && aliases.some((a) => metadataCategory.includes(a))) {
          score += 15;
          break;
        }
      }
    }
  }
  maxScore += 15;
  if (metadata.documentType === "cut_sheet")
    score += 15;
  else if (metadata.documentType === "spec_sheet")
    score += 12;
  else if (metadata.documentType === "catalog_page")
    score += 8;
  return Math.round(score / maxScore * 100);
}
export async function validatePdf(url, component, env2) {
  const startTime = Date.now();
  console.log(`[PDF Validator] Starting validation for: ${url}`);
  const download = await downloadPdf(url, env2);
  if (!download.success) {
    return {
      valid: false,
      stage: "download",
      error: download.error,
      errorCode: download.errorCode
    };
  }
  const hash = await calculateHash(download.buffer);
  console.log(`[PDF Validator] Hash: ${hash}`);
  const duplicate = await checkDuplicate(hash, env2);
  if (duplicate) {
    return {
      valid: false,
      stage: "deduplication",
      error: "Duplicate file detected",
      errorCode: "DUPLICATE",
      existingRecord: duplicate
    };
  }
  let tempKey = null;
  try {
    tempKey = await storeInTempStorage(download.buffer, hash, env2);
  } catch (storageError) {
    console.error("[PDF Validator] Storage error:", storageError);
  }
  const metadata = await analyzePdfWithClaude(download.buffer, component, env2);
  const matchScore = calculateMatchScore(metadata, component);
  const elapsed = Date.now() - startTime;
  console.log(`[PDF Validator] Validation complete in ${elapsed}ms - Score: ${matchScore}`);
  return {
    valid: true,
    url,
    hash,
    tempR2Key: tempKey,
    fileSize: download.contentLength,
    contentType: download.contentType,
    metadata,
    matchScore,
    matchesExpected: metadata.matchesExpectedProduct ?? matchScore >= 60,
    confidence: metadata.matchConfidence ?? matchScore / 100,
    processingTime: elapsed
  };
}
export async function validateCandidates(candidates, component, env2, maxCandidates = 3) {
  const results = [];
  const toValidate = candidates.slice(0, maxCandidates);
  for (const candidate of toValidate) {
    try {
      const result = await validatePdf(candidate.url, component, env2);
      if (result.valid) {
        results.push({
          ...candidate,
          ...result
        });
      } else {
        console.log(`[PDF Validator] Candidate failed: ${candidate.url} - ${result.error}`);
      }
    } catch (error4) {
      console.error(`[PDF Validator] Validation error for ${candidate.url}:`, error4);
    }
  }
  results.sort((a, b) => b.matchScore - a.matchScore);
  return results;
}

export var EXPANDED_URL_PATTERNS = {
  // =========================================================================
  // ALLEGION FAMILY
  // =========================================================================
  "schlage": {
    domains: ["us.allegion.com", "schlage.com", "commercial.schlage.com"],
    cdnBase: "https://us.allegion.com/content/dam/allegion-us-2",
    seriesNames: {
      "L": "L-Series",
      "L9": "L-Series",
      "ND": "ND-Series",
      "NDE": "NDE-Series",
      "AD": "AD-Series",
      "AL": "AL-Series",
      "CO": "CO-Series",
      "B": "B-Series",
      "D": "D-Series",
      "H": "H-Series",
      "LM": "LM9300-Series",
      "LE": "LE-Series",
      "S": "S-Series",
      "A": "A-Series",
      "CL": "CL-Series"
    },
    patterns: [
      // Known working pattern from actual Allegion CDN
      "{cdnBase}/pdf/commercial/schlage-commercial/{series}.pdf",
      // Alternative patterns
      "{cdnBase}/web-documents-2/Schlage_{seriesUnderscore}_Cut_Sheet.pdf",
      "{cdnBase}/web-files/schlage/information-documents/Schlage_{seriesUnderscore}_Cut_Sheet.pdf"
    ],
    // Direct URLs for series (no doc ID needed)
    directSeriesUrls: {
      "L-Series": "https://us.allegion.com/content/dam/allegion-us-2/pdf/commercial/schlage-commercial/L-Series.pdf",
      "ND-Series": "https://us.allegion.com/content/dam/allegion-us-2/pdf/commercial/schlage-commercial/ND-Series.pdf",
      "AD-Series": "https://us.allegion.com/content/dam/allegion-us-2/pdf/commercial/schlage-commercial/AD-Series.pdf",
      "AL-Series": "https://us.allegion.com/content/dam/allegion-us-2/pdf/commercial/schlage-commercial/AL-Series.pdf",
      "B-Series": "https://us.allegion.com/content/dam/allegion-us-2/pdf/commercial/schlage-commercial/B-Series.pdf",
      "CO-Series": "https://us.allegion.com/content/dam/allegion-us-2/pdf/commercial/schlage-commercial/CO-Series.pdf"
    },
    searchUrl: "https://us.allegion.com/en/home/search-results.html?q={query}"
  },
  "lcn": {
    domains: ["us.allegion.com", "lcnclosers.com"],
    cdnBase: "https://us.allegion.com/content/dam/allegion-us-2",
    seriesNames: {
      "4040": "4040XP-Series",
      "4040XP": "4040XP-Series",
      "4041": "4040XP-Series",
      "4000": "4000-Series",
      "4010": "4010-Series",
      "4110": "4110-Series",
      "1460": "1460-Series",
      "2010": "2010-Series",
      "4310": "4310-Series",
      "6400": "6400-Series",
      "4050": "4050A-Series"
    },
    patterns: [
      "{cdnBase}/pdf/commercial/lcn/{series}.pdf"
    ],
    directSeriesUrls: {
      "4040XP-Series": "https://us.allegion.com/content/dam/allegion-us-2/pdf/commercial/lcn/4040XP-Series.pdf",
      "4000-Series": "https://us.allegion.com/content/dam/allegion-us-2/pdf/commercial/lcn/4000-Series.pdf",
      "4010-Series": "https://us.allegion.com/content/dam/allegion-us-2/pdf/commercial/lcn/4010-Series.pdf",
      "4110-Series": "https://us.allegion.com/content/dam/allegion-us-2/pdf/commercial/lcn/4110-Series.pdf",
      "1460-Series": "https://us.allegion.com/content/dam/allegion-us-2/pdf/commercial/lcn/1460-Series.pdf"
    },
    searchUrl: "https://us.allegion.com/en/home/search-results.html?q={query}+lcn"
  },
  "ives": {
    domains: ["us.allegion.com", "iveshardware.com"],
    cdnBase: "https://us.allegion.com/content/dam/allegion-us-2",
    seriesNames: {
      "5BB": "5BB1",
      "5BB1": "5BB1",
      "3CB": "3CB1",
      "FB": "FB_Series",
      // XY Series Continuous Hinges (112XY, 114XY, 026XY, etc.)
      "112XY": "XY_Series",
      "114XY": "XY_Series",
      "026XY": "XY_Series",
      "XY": "XY_Series",
      // HD Series Continuous Hinges
      "112HD": "HD_Series",
      "114HD": "HD_Series"
    },
    patterns: [
      "{cdnBase}/web-documents-2/Template/Ives_{model}_Template_{docId}.pdf",
      "{cdnBase}/web-files/ives/information-documents/Ives_{model}_Data_Sheet_{docId}.pdf",
      "{cdnBase}/web-files/ives/installation-documents/Ives_Architectural_Hinges_Templates_Index_{docId}.pdf"
    ],
    // Direct URLs for known product series - highest confidence
    directSeriesUrls: {
      "XY_Series": "https://us.allegion.com/content/dam/allegion-us-2/web-files/ives/information-documents/Ives_XY_Series_Adjustable_Continuous_Hinges_Data_Sheet_111306.pdf",
      "HD_Series": "https://us.allegion.com/content/dam/allegion-us-2/web-files/ives/information-documents/Ives_HD_Series_Concealed_Leaf_Continuous_Hinges_Data_Sheet.pdf"
    },
    knownDocIds: {
      "Templates_Index": ["111763"],
      "Electrified_Hinge_Data_Sheet": ["110116"],
      "XY_Series_Data_Sheet": ["111306"]
    },
    searchUrl: "https://us.allegion.com/en/home/search-results.html?q={query}+ives"
  },
  "vonduprin": {
    domains: ["us.allegion.com", "vonduprin.com"],
    cdnBase: "https://us.allegion.com/content/dam/allegion-us-2",
    seriesNames: {
      "99": "98-99-Series",
      "98": "98-99-Series",
      "98/99": "98-99-Series",
      "33": "33A-Series",
      "33A": "33A-Series",
      "35": "35-Series",
      "22": "22-Series",
      "88": "88-Series",
      "94": "94-Series"
    },
    patterns: [
      "{cdnBase}/pdf/commercial/von-duprin/{series}.pdf"
    ],
    directSeriesUrls: {
      "98-99-Series": "https://us.allegion.com/content/dam/allegion-us-2/pdf/commercial/von-duprin/98-99-Series.pdf",
      "33A-Series": "https://us.allegion.com/content/dam/allegion-us-2/pdf/commercial/von-duprin/33A-Series.pdf",
      "35-Series": "https://us.allegion.com/content/dam/allegion-us-2/pdf/commercial/von-duprin/35-Series.pdf",
      "22-Series": "https://us.allegion.com/content/dam/allegion-us-2/pdf/commercial/von-duprin/22-Series.pdf",
      "88-Series": "https://us.allegion.com/content/dam/allegion-us-2/pdf/commercial/von-duprin/88-Series.pdf"
    },
    searchUrl: "https://us.allegion.com/en/home/search-results.html?q={query}+von+duprin"
  },
  // =========================================================================
  // ASSA ABLOY FAMILY
  // =========================================================================
  "sargent": {
    domains: ["assaabloydss.com", "sargentlock.com", "assaabloy.com", "content.assaabloyusa.com"],
    cdnBases: [
      "https://content.assaabloyusa.com/doc",
      "https://dvwi9lnoau63q.cloudfront.net/sargent"
    ],
    seriesNames: {
      "8200": "8200_Series",
      "7800": "7800_8200_Series",
      "8800": "8800_Series",
      "8900": "8900_Series",
      "6500": "6500_Series",
      "7500": "7500_Series",
      "IN": "IN_Series",
      "SN": "SN_Series"
    },
    patterns: [
      "https://dvwi9lnoau63q.cloudfront.net/sargent/instruction-sheets/{model}.pdf",
      "https://dvwi9lnoau63q.cloudfront.net/sargent/catalog/{series}_Catalog.pdf",
      "https://content.assaabloyusa.com/doc/AADSS{docId}&.pdf"
    ],
    searchUrl: "https://www.assaabloydss.com/search?query={query}"
  },
  "yale": {
    domains: ["assaabloydss.com", "yalecommercial.com", "yalelock.com"],
    seriesNames: {
      "8000": "8000_Series",
      "8500": "8500_Series",
      "8700": "8700_Series",
      "8800": "8800_Series",
      "AU": "AU_Series",
      "nexTouch": "nexTouch"
    },
    patterns: [
      "https://content.assaabloyusa.com/doc/AADSS{docId}&.pdf",
      "https://dvwi9lnoau63q.cloudfront.net/yale/catalog/{series}.pdf"
    ],
    searchUrl: "https://www.assaabloydss.com/search?query={query}+yale"
  },
  "falcon": {
    domains: ["assaabloydss.com", "falconlock.com"],
    patterns: [
      "https://content.assaabloyusa.com/doc/AADSS{docId}&.pdf",
      "https://dvwi9lnoau63q.cloudfront.net/falcon/catalog/{series}.pdf"
    ],
    searchUrl: "https://www.assaabloydss.com/search?query={query}+falcon"
  },
  // =========================================================================
  // DORMAKABA
  // =========================================================================
  "dormakaba": {
    domains: ["dormakaba.com", "dorma.com"],
    seriesNames: {
      "8600": "8600_Series",
      "8000": "8000_Series",
      "9600": "9600_Series",
      "9300": "9300_Series",
      "7500": "7500_Series"
    },
    patterns: [
      "https://www.dormakaba.com/resource/blob/{blobId}/{hash}/{filename}-pdf-data.pdf",
      "https://dormakaba.com/resource/blob/{blobId}/{hash}/{filename}-pdf-data.pdf"
    ],
    knownBlobIds: {
      "8000_Series": "192714",
      "9600_Series": "180756",
      "9300_Series": "192338"
    },
    searchUrl: "https://www.dormakaba.com/us-en/search?q={query}"
  },
  // =========================================================================
  // HAGER
  // =========================================================================
  "hager": {
    domains: ["hagerco.com", "www.hagerco.com"],
    cdnBase: "https://www.hagerco.com/Files",
    seriesNames: {
      "BB1191": "BB1191",
      "BB1199": "BB1199",
      "BB1168": "BB1168",
      "BB1279": "BB1279",
      "780": "780_Series",
      "4500": "4500_Series",
      "3800": "3800_Series",
      "2500": "2500_Series"
    },
    patterns: [
      "{cdnBase}/Images/Images/TemplateDetails/T-{templateId}.pdf",
      "{cdnBase}/Images/Images/TemplateDetails/T{templateNum}.pdf",
      "{cdnBase}/Images/Images/Instructions/{partNum}_{model}.pdf",
      "{cdnBase}/Files/Product Information/{filename}.pdf"
    ],
    knownTemplates: {
      "BB1191": ["T315", "T-CT00181"],
      "BB1279": ["T315", "T-CT00181"]
    },
    searchUrl: "https://www.hagerco.com/search?q={query}"
  },
  // =========================================================================
  // ZERO INTERNATIONAL
  // =========================================================================
  "zero": {
    domains: ["zerointernational.com", "www.zerointernational.com"],
    patterns: [
      "https://www.zerointernational.com/files/products/{model}.pdf",
      "https://www.zerointernational.com/files/catalogs/{catalog}.pdf"
    ],
    searchUrl: "https://www.zerointernational.com/search?query={query}"
  }
};
export function generateSmartUrls(manufacturer, model, normalizedInfo) {
  const mfrKey = normalizeManufacturerKey(manufacturer);
  const config3 = EXPANDED_URL_PATTERNS[mfrKey];
  if (!config3) {
    return [];
  }
  const urls = [];
  const { baseModel, series, variants } = normalizedInfo;
  if (config3.directSeriesUrls && series) {
    const directUrl = config3.directSeriesUrls[series];
    if (directUrl) {
      urls.push({
        url: directUrl,
        confidence: 0.98,
        source: "direct_series_url"
      });
    }
  }
  if (config3.directSeriesUrls && baseModel) {
    for (const [prefix, seriesName] of Object.entries(config3.seriesNames || {})) {
      if (baseModel.toUpperCase().startsWith(prefix.toUpperCase())) {
        const directUrl = config3.directSeriesUrls[seriesName];
        if (directUrl && !urls.some((u) => u.url === directUrl)) {
          urls.push({
            url: directUrl,
            confidence: 0.97,
            source: "direct_series_url_from_model"
          });
        }
        break;
      }
    }
  }
  if (config3.seriesNames) {
    for (const variant of variants || [baseModel]) {
      for (const [prefix, seriesName] of Object.entries(config3.seriesNames)) {
        if (variant && variant.toUpperCase().startsWith(prefix.toUpperCase())) {
          for (const pattern of config3.patterns) {
            const url = pattern.replace("{cdnBase}", config3.cdnBase || "").replace("{series}", seriesName).replace("{model}", variant).replace(/_{docId}/g, "");
            if (!url.includes("{")) {
              urls.push({
                url,
                confidence: 0.7,
                source: "pattern_match"
              });
            }
          }
          break;
        }
      }
    }
  }
  for (const variant of variants || [baseModel]) {
    if (!variant)
      continue;
    for (const pattern of config3.patterns) {
      const url = pattern.replace("{cdnBase}", config3.cdnBase || "").replace("{model}", variant).replace("{MODEL}", variant.toUpperCase()).replace(/_{docId}/g, "").replace(/_{series}/g, "");
      if (!url.includes("{")) {
        urls.push({
          url,
          confidence: 0.5,
          source: "direct_substitution"
        });
      }
    }
  }
  const seen = /* @__PURE__ */ new Set();
  return urls.filter((item) => {
    if (seen.has(item.url))
      return false;
    seen.add(item.url);
    return true;
  });
}

export var ALLEGION_CDN_BASE = "https://us.allegion.com/content/dam/allegion-us-2";
export var ALLEGION_BRAND_REGISTRY = {
  // =========================================================================
  // LOCK & ACCESS CONTROL BRANDS
  // =========================================================================
  "schlage": {
    displayName: "Schlage",
    documentLibrary: "https://us.allegion.com/en/resources/resource-library/document-library/schlage-documents.html",
    cdnFolders: {
      cutSheets: "pdf/commercial/schlage-commercial",
      information: "web-files/schlage/information-documents",
      installation: "web-files/schlage/installation-documents",
      technical: "web-files/schlage/technical-documents"
    },
    seriesPatterns: {
      "L": { series: "L-Series", type: "mortise_lock" },
      "L9": { series: "L-Series", type: "mortise_lock" },
      "ND": { series: "ND-Series", type: "cylindrical_lock" },
      "NDE": { series: "NDE-Series", type: "wireless_lock" },
      "AD": { series: "AD-Series", type: "electronic_lock" },
      "AL": { series: "AL-Series", type: "cylindrical_lock" },
      "CO": { series: "CO-Series", type: "electronic_lock" },
      "B": { series: "B-Series", type: "deadbolt" },
      "D": { series: "D-Series", type: "cylindrical_lock" },
      "H": { series: "H-Series", type: "hospital_lock" },
      "S": { series: "S-Series", type: "cylindrical_lock" },
      "A": { series: "A-Series", type: "cylindrical_lock" },
      "CL": { series: "CL-Series", type: "cylindrical_lock" }
    },
    directUrls: {
      "L-Series": `${ALLEGION_CDN_BASE}/pdf/commercial/schlage-commercial/L-Series.pdf`,
      "ND-Series": `${ALLEGION_CDN_BASE}/pdf/commercial/schlage-commercial/ND-Series.pdf`,
      "AD-Series": `${ALLEGION_CDN_BASE}/pdf/commercial/schlage-commercial/AD-Series.pdf`,
      "AL-Series": `${ALLEGION_CDN_BASE}/pdf/commercial/schlage-commercial/AL-Series.pdf`,
      "B-Series": `${ALLEGION_CDN_BASE}/pdf/commercial/schlage-commercial/B-Series.pdf`,
      "CO-Series": `${ALLEGION_CDN_BASE}/pdf/commercial/schlage-commercial/CO-Series.pdf`
    },
    aliases: ["sch", "schl", "schlage"]
  },
  "falcon": {
    displayName: "Falcon",
    documentLibrary: "https://us.allegion.com/en/resources/resource-library/document-library/falcon-documents.html",
    cdnFolders: {
      information: "web-files/falcon/information-documents",
      installation: "web-files/falcon/installation-documents",
      technical: "web-files/falcon/technical-documents"
    },
    seriesPatterns: {
      "W": { series: "W-Series", type: "cylindrical_lock" },
      "X": { series: "X-Series", type: "exit_device" },
      "T": { series: "T-Series", type: "cylindrical_lock" },
      "B": { series: "B-Series", type: "cylindrical_lock" },
      "D": { series: "D-Series", type: "cylindrical_lock" },
      "H": { series: "H-Series", type: "interconnected_lock" },
      "H2": { series: "H2-Series", type: "interconnected_lock" },
      "K": { series: "K-Series", type: "cylindrical_lock" },
      "RU": { series: "RU-Series", type: "cylindrical_lock" },
      "MA": { series: "MA-Series", type: "mortise_lock" }
    },
    directUrls: {
      "H2-Series": `${ALLEGION_CDN_BASE}/web-files/falcon/information-documents/Falcon_H2_Data_Sheet_111396.pdf`,
      "K-Series": `${ALLEGION_CDN_BASE}/web-files/falcon/information-documents/Falcon_K_Series_Data_Sheet_110876.pdf`,
      "RU-Series": `${ALLEGION_CDN_BASE}/web-documents-2/DataSheet/Falcon_RU_Series_Data_Sheet_111440.pdf`,
      "Locks_Catalog": `${ALLEGION_CDN_BASE}/web-files/falcon/information-documents/Falcon_Locks_Catalog_110449.pdf`,
      "Cylindrical_Guide": `${ALLEGION_CDN_BASE}/web-files/falcon/information-documents/Falcon_Cylindrical_Lock_Guide_110894.pdf`
    },
    aliases: ["fal", "falcon"]
  },
  "dexter": {
    displayName: "Dexter by Schlage",
    documentLibrary: "https://us.allegion.com/en/resources/resource-library/document-library/dexter-documents.html",
    cdnFolders: {
      information: "web-files/dexter/information-documents",
      installation: "web-files/dexter/installation-documents"
    },
    aliases: ["dex", "dexter"]
  },
  "locknetics": {
    displayName: "Locknetics",
    documentLibrary: "https://us.allegion.com/en/resources/resource-library/document-library/locknetics-documents.html",
    cdnFolders: {
      information: "web-files/locknetics/information-documents",
      installation: "web-files/locknetics/installation-documents",
      technical: "web-files/locknetics/technical-documents"
    },
    seriesPatterns: {
      "LP": { series: "LP-Series", type: "power_supply" },
      "CS": { series: "CS-Series", type: "electric_strike" },
      "CM": { series: "CM-Series", type: "cabinet_lock" }
    },
    aliases: ["lock", "locknetics"]
  },
  "isonas": {
    displayName: "ISONAS",
    documentLibrary: "https://us.allegion.com/en/resources/resource-library/document-library/isonas-documents.html",
    cdnFolders: {
      information: "web-files/isonas/information-documents",
      technical: "web-files/isonas/technical-documents"
    },
    aliases: ["iso", "isonas"]
  },
  // =========================================================================
  // DOOR CONTROL BRANDS
  // =========================================================================
  "lcn": {
    displayName: "LCN",
    documentLibrary: "https://us.allegion.com/en/resources/resource-library/document-library/lcn-documents.html",
    cdnFolders: {
      cutSheets: "pdf/commercial/lcn",
      information: "web-files/lcn/information-documents",
      installation: "web-files/lcn/installation-documents",
      technical: "web-files/lcn/technical-documents"
    },
    seriesPatterns: {
      "4040": { series: "4040XP-Series", type: "door_closer" },
      "4040XP": { series: "4040XP-Series", type: "door_closer" },
      "4041": { series: "4040XP-Series", type: "door_closer" },
      "4000": { series: "4000-Series", type: "door_closer" },
      "4010": { series: "4010-Series", type: "door_closer" },
      "4110": { series: "4110-Series", type: "door_closer" },
      "1460": { series: "1460-Series", type: "door_closer" },
      "2010": { series: "2010-Series", type: "door_closer" },
      "4310": { series: "4310-Series", type: "door_closer" },
      "6400": { series: "6400-Series", type: "automatic_operator" },
      "4050": { series: "4050A-Series", type: "door_closer" }
    },
    directUrls: {
      "4040XP-Series": `${ALLEGION_CDN_BASE}/pdf/commercial/lcn/4040XP-Series.pdf`,
      "4000-Series": `${ALLEGION_CDN_BASE}/pdf/commercial/lcn/4000-Series.pdf`,
      "4010-Series": `${ALLEGION_CDN_BASE}/pdf/commercial/lcn/4010-Series.pdf`,
      "4110-Series": `${ALLEGION_CDN_BASE}/pdf/commercial/lcn/4110-Series.pdf`,
      "1460-Series": `${ALLEGION_CDN_BASE}/pdf/commercial/lcn/1460-Series.pdf`
    },
    aliases: ["lcn"]
  },
  // =========================================================================
  // EXIT DEVICE BRANDS
  // =========================================================================
  "vonduprin": {
    displayName: "Von Duprin",
    documentLibrary: "https://us.allegion.com/en/resources/resource-library/document-library/von-duprin-documents.html",
    cdnFolders: {
      cutSheets: "pdf/commercial/von-duprin",
      information: "web-files/von-duprin/information-documents",
      installation: "web-files/von-duprin/installation-documents",
      technical: "web-files/von-duprin/technical-documents"
    },
    seriesPatterns: {
      "99": { series: "98-99-Series", type: "exit_device" },
      "98": { series: "98-99-Series", type: "exit_device" },
      "33": { series: "33A-Series", type: "exit_device" },
      "33A": { series: "33A-Series", type: "exit_device" },
      "35": { series: "35-Series", type: "exit_device" },
      "22": { series: "22-Series", type: "exit_device" },
      "88": { series: "88-Series", type: "exit_device" },
      "94": { series: "94-Series", type: "exit_device" },
      "QEL": { series: "QEL-Series", type: "exit_device" },
      "EPT": { series: "EPT-Series", type: "electric_power_transfer" }
    },
    directUrls: {
      "98-99-Series": `${ALLEGION_CDN_BASE}/pdf/commercial/von-duprin/98-99-Series.pdf`,
      "33A-Series": `${ALLEGION_CDN_BASE}/pdf/commercial/von-duprin/33A-Series.pdf`,
      "35-Series": `${ALLEGION_CDN_BASE}/pdf/commercial/von-duprin/35-Series.pdf`,
      "22-Series": `${ALLEGION_CDN_BASE}/pdf/commercial/von-duprin/22-Series.pdf`,
      "88-Series": `${ALLEGION_CDN_BASE}/pdf/commercial/von-duprin/88-Series.pdf`
    },
    aliases: ["vondupr", "vondp", "vd", "von duprin", "von", "vonduprin"]
  },
  // =========================================================================
  // DOOR HARDWARE BRANDS
  // =========================================================================
  "ives": {
    displayName: "IVES",
    documentLibrary: "https://us.allegion.com/en/resources/resource-library/document-library/ives-documents.html",
    cdnFolders: {
      information: "web-files/ives/information-documents",
      installation: "web-files/ives/installation-documents",
      technical: "web-files/ives/technical-documents",
      templates: "web-documents-2/Template"
    },
    seriesPatterns: {
      // Hinges
      "5BB": { series: "5BB1", type: "ball_bearing_hinge" },
      "5BB1": { series: "5BB1", type: "ball_bearing_hinge" },
      "3CB": { series: "3CB1", type: "concealed_bearing_hinge" },
      // Continuous Hinges - XY Series (Adjustable)
      "112XY": { series: "XY_Series", type: "continuous_hinge" },
      "114XY": { series: "XY_Series", type: "continuous_hinge" },
      "026XY": { series: "XY_Series", type: "continuous_hinge" },
      "XY": { series: "XY_Series", type: "continuous_hinge" },
      // Continuous Hinges - HD Series (Concealed)
      "112HD": { series: "HD_Series", type: "continuous_hinge" },
      "114HD": { series: "HD_Series", type: "continuous_hinge" },
      // Door Stops & Holders
      "FB": { series: "FB_Series", type: "flush_bolt" },
      "WS": { series: "WS_Series", type: "wall_stop" },
      "FS": { series: "FS_Series", type: "floor_stop" }
    },
    directUrls: {
      "XY_Series": `${ALLEGION_CDN_BASE}/web-files/ives/information-documents/Ives_XY_Series_Adjustable_Continuous_Hinges_Data_Sheet_111306.pdf`,
      "Templates_Index": `${ALLEGION_CDN_BASE}/web-files/ives/installation-documents/Ives_Continuous_Hinges_Templates_Index_111773.pdf`,
      "Architectural_Hinges": `${ALLEGION_CDN_BASE}/web-files/ives/installation-documents/Ives_Architectural_Hinges_Templates_Index_111763.pdf`
    },
    aliases: ["iv", "ive", "ives"]
  },
  "glynnJohnson": {
    displayName: "Glynn-Johnson",
    documentLibrary: "https://us.allegion.com/en/resources/resource-library/document-library/glynn-johnson-documents.html",
    cdnFolders: {
      information: "web-files/glynn-johnson/information-documents",
      installation: "web-files/glynn-johnson/installation-documents",
      technical: "web-files/glynn-johnson/technical-documents"
    },
    seriesPatterns: {
      "90": { series: "90-Series", type: "overhead_holder" },
      "100": { series: "100-Series", type: "concealed_holder" },
      "100ADJ": { series: "100ADJ-Series", type: "concealed_holder" },
      "410": { series: "410-Series", type: "concealed_holder" },
      "450": { series: "450-Series", type: "surface_holder" },
      "81": { series: "81-Series", type: "surface_holder" }
    },
    directUrls: {
      "Catalog": `${ALLEGION_CDN_BASE}/web-files/glynn-johnson/information-documents/Glynn-Johnson_Overhead_Door_Holders.Stops_Catalog_101401.pdf`
    },
    aliases: ["gj", "glynn", "glynnJohnson", "glynn-johnson"]
  },
  // =========================================================================
  // DOOR & FRAME BRANDS
  // =========================================================================
  "steelcraft": {
    displayName: "Steelcraft",
    documentLibrary: "https://us.allegion.com/en/resources/resource-library/document-library/steelcraft-documents.html",
    cdnFolders: {
      information: "web-files/steelcraft/information-documents",
      installation: "web-files/steelcraft/installation-documents",
      technical: "web-files/steelcraft/technical-documents"
    },
    aliases: ["sc", "steel", "steelcraft"]
  },
  "republic": {
    displayName: "Republic",
    documentLibrary: "https://us.allegion.com/en/resources/resource-library/document-library/republic-documents.html",
    cdnFolders: {
      information: "web-files/republic/information-documents",
      technical: "web-files/republic/technical-documents",
      priceBook: "web-files/republic/price-book"
    },
    seriesPatterns: {
      "ME": { series: "ME-Series", type: "steel_frame" },
      "MH": { series: "MH-Series", type: "steel_frame" },
      "MK": { series: "MK-Series", type: "steel_frame" },
      "DL": { series: "DL-Series", type: "steel_door" },
      "DE": { series: "DE-Series", type: "steel_door" },
      "DP": { series: "DP-Series", type: "steel_door" }
    },
    directUrls: {
      "Bullet_Resistant": `${ALLEGION_CDN_BASE}/web-files/republic/information-documents/Republic_Bullet_Resistant_Data_Sheet_111906.pdf`,
      "Embossed_Doors": `${ALLEGION_CDN_BASE}/web-files/republic/information-documents/Republic_Embossed_Doors_Data_Sheet_111935.pdf`
    },
    aliases: ["rep", "republic"]
  },
  // =========================================================================
  // SEALING & SPECIALTY BRANDS
  // =========================================================================
  "zero": {
    displayName: "Zero International",
    documentLibrary: "https://us.allegion.com/en/resources/resource-library/document-library/zero-international-documents.html",
    cdnFolders: {
      information: "web-files/zero/information-documents",
      installation: "web-files/zero/installation-documents",
      technical: "web-files/zero/technical-documents"
    },
    productCategories: ["thresholds", "perimeter_seals", "weatherstripping", "intumescent"],
    directUrls: {
      "Thresholds_164": `${ALLEGION_CDN_BASE}/web-files/zero/information-documents/zero_thresholds_164_data_sheet_012523.pdf`,
      "Thresholds_544": `${ALLEGION_CDN_BASE}/web-files/zero/information-documents/zero_thresholds_544_data_sheet_012514.pdf`,
      "Thresholds_564": `${ALLEGION_CDN_BASE}/web-files/zero/information-documents/zero_thresholds_564_data_sheet_012548.pdf`
    },
    aliases: ["zero", "zeroint", "zero international"]
  },
  "brio": {
    displayName: "Brio",
    documentLibrary: "https://us.allegion.com/en/resources/resource-library/document-library.html",
    cdnFolders: {
      information: "web-files/brio/information-documents"
    },
    aliases: ["brio"]
  },
  "advantage": {
    displayName: "Advantage Lites & Louvers",
    documentLibrary: "https://us.allegion.com/en/resources/resource-library/document-library.html",
    cdnFolders: {
      information: "web-files/advantage/information-documents"
    },
    aliases: ["adv", "advantage"]
  }
};
export function generateAllegionUrls(manufacturer, model) {
  const brandKey = findBrandByAlias(manufacturer);
  if (!brandKey)
    return [];
  const brand = ALLEGION_BRAND_REGISTRY[brandKey];
  const urls = [];
  const modelUpper = (model || "").toUpperCase().trim();
  if (brand.directUrls && brand.seriesPatterns) {
    for (const [prefix, info5] of Object.entries(brand.seriesPatterns)) {
      if (modelUpper.startsWith(prefix.toUpperCase())) {
        const directUrl = brand.directUrls[info5.series];
        if (directUrl) {
          urls.push({
            url: directUrl,
            confidence: 0.98,
            source: "allegion_direct_series",
            brand: brand.displayName,
            series: info5.series,
            type: info5.type
          });
        }
        break;
      }
    }
  }
  if (brand.cdnFolders) {
    const folders = ["cutSheets", "information"];
    for (const folder of folders) {
      if (brand.cdnFolders[folder]) {
        for (const [prefix, info5] of Object.entries(brand.seriesPatterns || {})) {
          if (modelUpper.startsWith(prefix.toUpperCase())) {
            const filename = `${brand.displayName.replace(/[^a-zA-Z]/g, "_")}_${info5.series.replace(/-/g, "_")}_Data_Sheet`;
            urls.push({
              url: `${ALLEGION_CDN_BASE}/${brand.cdnFolders[folder]}/${filename}.pdf`,
              confidence: 0.7,
              source: "allegion_cdn_pattern",
              brand: brand.displayName,
              series: info5.series
            });
          }
        }
      }
    }
  }
  const seen = /* @__PURE__ */ new Set();
  return urls.filter((item) => {
    if (seen.has(item.url))
      return false;
    seen.add(item.url);
    return true;
  });
}
export function findBrandByAlias(manufacturer) {
  if (!manufacturer)
    return null;
  const lower = manufacturer.toLowerCase().replace(/[^a-z0-9]/g, "");
  for (const [key, brand] of Object.entries(ALLEGION_BRAND_REGISTRY)) {
    if (brand.aliases && brand.aliases.some(
      (alias) => lower === alias.toLowerCase().replace(/[^a-z0-9]/g, "") || lower.startsWith(alias.toLowerCase().replace(/[^a-z0-9]/g, ""))
    )) {
      return key;
    }
  }
  return null;
}
export function isAllegionBrand(manufacturer) {
  return findBrandByAlias(manufacturer) !== null;
}

export async function logDiscoveryTelemetry(env2, event) {
  if (!env2?.DB)
    return;
  const id = crypto.randomUUID();
  const eventData = {
    id,
    event_type: "discovery",
    event_name: event.name,
    severity: event.severity || "info",
    message: event.message,
    context: JSON.stringify(event.context || {}),
    client_timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  try {
    await env2.DB.prepare(`
      INSERT INTO client_telemetry (id, event_type, event_name, severity, message, context, client_timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      eventData.id,
      eventData.event_type,
      eventData.event_name,
      eventData.severity,
      eventData.message,
      eventData.context,
      eventData.client_timestamp
    ).run();
  } catch (err) {
    console.warn("[Discovery Telemetry] Failed to log:", err.message);
  }
}
export async function checkUserAffirmedCache(manufacturer, model, userId, env2) {
  if (!env2?.DB || !userId) {
    return { found: false };
  }
  const mfrKey = normalizeManufacturerKey(manufacturer);
  try {
    const result = await env2.DB.prepare(`
      SELECT id, catalogue_id, page_start, page_end, r2_key, affirmed_at, affirmed_by
      FROM user_affirmed_cutsheets
      WHERE user_id = ?
        AND (manufacturer = ? OR manufacturer = ?)
        AND (model = ? OR component_hash = ?)
      ORDER BY affirmed_at DESC
      LIMIT 1
    `).bind(
      userId,
      mfrKey,
      manufacturer.toLowerCase(),
      model,
      `${mfrKey}_${model}`.toLowerCase().replace(/[^a-z0-9]/g, "_")
    ).first();
    if (result && result.r2_key) {
      console.log(`[Discovery] USER CACHE HIT: ${result.r2_key} (affirmed ${result.affirmed_at})`);
      return {
        found: true,
        source: "user_affirmed_cache",
        r2Key: result.r2_key,
        catalogueId: result.catalogue_id,
        pageStart: result.page_start,
        pageEnd: result.page_end,
        affirmedAt: result.affirmed_at,
        affirmedBy: result.affirmed_by,
        confidence: 1
        // User affirmed = 100% confidence
      };
    }
    return { found: false };
  } catch (error4) {
    console.error("[Discovery] User cache lookup error:", error4.message);
    return { found: false };
  }
}
export async function searchCPSCatalogue(manufacturer, model, env2) {
  if (!env2?.CPS_API_URL && !env2?.INTERNAL_API) {
    console.log("[Discovery] CPS API not configured - skipping CPS search");
    return { found: false };
  }
  const searchQuery = model || "";
  if (!searchQuery) {
    return { found: false };
  }
  try {
    const apiBase = env2.CPS_API_URL || "";
    const cpsUrl = `${apiBase}/api/cps/search?q=${encodeURIComponent(searchQuery)}`;
    console.log(`[Discovery] Searching CPS catalogue for: ${searchQuery}`);
    let response;
    if (env2.INTERNAL_API) {
      response = await env2.INTERNAL_API.fetch(new Request(cpsUrl));
    } else {
      response = await fetch(cpsUrl, {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "User-Agent": "Weyland-Discovery/2.0",
          "X-Internal-API": "Weyland-Discovery"
          // Bypass auth for internal service calls
        }
      });
    }
    if (!response.ok) {
      console.log(`[Discovery] CPS API returned ${response.status}`);
      return { found: false };
    }
    const data = await response.json();
    if (!data.mappings || data.mappings.length === 0) {
      console.log("[Discovery] No CPS matches found");
      return { found: false };
    }
    const bestMatch = data.mappings[0];
    let confidence = 0.92;
    const normalizedModel = model.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const normalizedMatch = (bestMatch.model_number || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (normalizedModel === normalizedMatch) {
      confidence = 0.97;
    } else if (normalizedMatch.includes(normalizedModel) || normalizedModel.includes(normalizedMatch)) {
      confidence = 0.94;
    }
    await logDiscoveryTelemetry(env2, {
      name: "cps_catalogue_hit",
      severity: "info",
      message: `CPS catalogue match: ${bestMatch.catalogue_id}`,
      context: {
        manufacturer,
        model,
        catalogueId: bestMatch.catalogue_id,
        mappingId: bestMatch.id,
        confidence,
        matchedModel: bestMatch.model_number
      }
    });
    console.log(`[Discovery] CPS catalogue hit: ${bestMatch.catalogue_id} (confidence: ${confidence})`);
    return {
      found: true,
      mappingId: bestMatch.id,
      catalogueId: bestMatch.catalogue_id,
      catalogueName: bestMatch.catalogue_name,
      manufacturer: bestMatch.manufacturer,
      modelNumber: bestMatch.model_number,
      pages: bestMatch.pages || [],
      pageStart: bestMatch.page_start,
      pageEnd: bestMatch.page_end,
      confidence,
      source: "cps_catalogue"
    };
  } catch (error4) {
    console.error("[Discovery] CPS search error:", error4.message);
    await logDiscoveryTelemetry(env2, {
      name: "cps_catalogue_error",
      severity: "error",
      message: `CPS search failed: ${error4.message}`,
      context: { manufacturer, model, error: error4.message }
    });
    return { found: false };
  }
}
export var LOCAL_CATALOGUE_INDEX = {
  version: "0.0.1",
  files: [
    { filename: "glynn-johnson_100-series_101f_cutsheet.pdf", path: "allegion/glynn-johnson/glynn-johnson_100-series_101f_cutsheet.pdf", manufacturer: "glynn-johnson", parent_company: "allegion", series: "100 Series", models_covered: ["106F", "103F", "102F", "106S", "105F", "101F", "101S", "103S", "102S", "104F", "104S", "105S", "100 Series"] },
    { filename: "glynn-johnson_400-series_430_cutsheet.pdf", path: "allegion/glynn-johnson/glynn-johnson_400-series_430_cutsheet.pdf", manufacturer: "glynn-johnson", parent_company: "allegion", series: "400 Series", models_covered: ["450", "440", "430", "420", "410"] },
    { filename: "glynn-johnson_overhead-series_10_cutsheet.pdf", path: "allegion/glynn-johnson/glynn-johnson_overhead-series_10_cutsheet.pdf", manufacturer: "glynn-johnson", parent_company: "allegion", series: "Overhead Series", models_covered: ["90", "700", "100 Series", "600", "10", "Overhead"] },
    { filename: "ives_229b-series_229b_cutsheet.pdf", path: "allegion/ives/ives_229b-series_229b_cutsheet.pdf", manufacturer: "ives", parent_company: "allegion", series: "229B Series", models_covered: ["229B3/4", "229B", "230B3/4", "229B 3/4", "230B 3/4", "230B"] },
    { filename: "ives_5bb1-series_5bb1_cutsheet.pdf", path: "allegion/ives/ives_5bb1-series_5bb1_cutsheet.pdf", manufacturer: "ives", parent_company: "allegion", series: "5BB1 Series", models_covered: ["5PB1", "5BB1", "5BB1HW", "5BB1 3.5", "5PB1 4.5", "5BB1 4"] },
    { filename: "ives_fb31p-series_fb31p_cutsheet.pdf", path: "allegion/ives/ives_fb31p-series_fb31p_cutsheet.pdf", manufacturer: "ives", parent_company: "allegion", series: "FB31P Series", models_covered: ["FB31P", "FB31P-12", "FB41P", "FB51P", "FB61P", "FB31P-8", "FB21P"] },
    { filename: "lcn_1461-series_1461_cutsheet.pdf", path: "allegion/lcn/lcn_1461-series_1461_cutsheet.pdf", manufacturer: "lcn", parent_company: "allegion", series: "1461 Series", models_covered: ["1461", "1461 SHCUSH", "1461 Rw/PA", "1461 EDA", "1461 T"] },
    { filename: "lcn_4010-series_4010_cutsheet.pdf", path: "allegion/lcn/lcn_4010-series_4010_cutsheet.pdf", manufacturer: "lcn", parent_company: "allegion", series: "4010 Series", models_covered: ["4011", "4010", "4016", "4030", "4031", "4040"] },
    { filename: "lcn_4040xp-series_4040xp_cutsheet.pdf", path: "allegion/lcn/lcn_4040xp-series_4040xp_cutsheet.pdf", manufacturer: "lcn", parent_company: "allegion", series: "4040XP Series", models_covered: ["4040XP", "4040XP SCUSH", "4040XP EDA", "4040XP SHCUSH", "4040XP RW/PA"] },
    { filename: "lcn_4640-series_4640_cutsheet.pdf", path: "allegion/lcn/lcn_4640-series_4640_cutsheet.pdf", manufacturer: "lcn", parent_company: "allegion", series: "4640 Series", models_covered: ["4640", "4642", "4644", "4646", "SEM7830"] },
    { filename: "lcn_8310-series_8310_cutsheet.pdf", path: "allegion/lcn/lcn_8310-series_8310_cutsheet.pdf", manufacturer: "lcn", parent_company: "allegion", series: "8310 Series", models_covered: ["8310-836", "8310", "8310-516", "8310-3836", "8310-865"] },
    { filename: "schlage_a-series_a10_cutsheet.pdf", path: "allegion/schlage/schlage_a-series_a10_cutsheet.pdf", manufacturer: "schlage", parent_company: "allegion", series: "A Series", models_covered: ["A170", "A53PD", "A25D", "A10", "A70PD", "A50PD", "A30D", "A40", "A80PD"] },
    { filename: "schlage_b-series_b60n_cutsheet.pdf", path: "allegion/schlage/schlage_b-series_b60n_cutsheet.pdf", manufacturer: "schlage", parent_company: "allegion", series: "B Series", models_covered: ["B60N", "B62N", "B562", "B660P", "B571", "B581", "B250PD"] },
    { filename: "schlage_co-series_co100_cutsheet.pdf", path: "allegion/schlage/schlage_co-series_co100_cutsheet.pdf", manufacturer: "schlage", parent_company: "allegion", series: "CO Series", models_covered: ["CO-220", "CO-200", "CO-100", "CO-250", "CO Series"] },
    { filename: "schlage_l-series_l9010_cutsheet.pdf", path: "allegion/schlage/schlage_l-series_l9010_cutsheet.pdf", manufacturer: "schlage", parent_company: "allegion", series: "L Series", models_covered: ["L9453", "L9080", "L9010", "L9040", "L9050", "L9056", "L9060", "L9070", "L9071", "L9044", "L9466", "L9496", "L9465", "L9092", "L9082", "L9076", "L9073", "L9175", "L9170", "L9180", "L9190", "L9077", "L9485", "L9453L", "L9486", "L9091", "L9462", "L9463", "L9464", "L9495"] },
    { filename: "schlage_nd-series_nd25d_cutsheet.pdf", path: "allegion/schlage/schlage_nd-series_nd25d_cutsheet.pdf", manufacturer: "schlage", parent_company: "allegion", series: "ND Series", models_covered: ["ND80PD", "ND25D", "ND50PD", "ND53PD", "ND60PD", "ND70PD", "ND40", "ND30D", "ND96PD", "ND91PD"] },
    { filename: "steelcraft_l-series_l-frame_cutsheet.pdf", path: "allegion/steelcraft/steelcraft_l-series_l-frame_cutsheet.pdf", manufacturer: "steelcraft", parent_company: "allegion", series: "L Series", models_covered: ["L Frame", "T Frame", "LW Frame", "TW Frame", "Z Frame", "F Frame", "B Frame", "K Frame", "J Frame", "P Frame", "S Frame"] },
    { filename: "von-duprin_33a-series_33a_cutsheet.pdf", path: "allegion/von-duprin/von-duprin_33a-series_33a_cutsheet.pdf", manufacturer: "von-duprin", parent_company: "allegion", series: "33A Series", models_covered: ["33A-EO-F", "33A", "33A-EO", "35A", "35A-EO", "33A-NL", "35A-NL"] },
    { filename: "von-duprin_98-series_9827_cutsheet.pdf", path: "allegion/von-duprin/von-duprin_98-series_9827_cutsheet.pdf", manufacturer: "von-duprin", parent_company: "allegion", series: "98 Series", models_covered: ["9875", "9857", "9827", "98/99EO", "9947", "9927", "98", "99"] },
    { filename: "von-duprin_99-series_9947_cutsheet.pdf", path: "allegion/von-duprin/von-duprin_99-series_9947_cutsheet.pdf", manufacturer: "von-duprin", parent_company: "allegion", series: "99 Series", models_covered: ["99EO", "9947", "9975", "9927", "9975EO", "9957", "98EO", "98", "99"] },
    { filename: "von-duprin_cd-series_cd98_cutsheet.pdf", path: "allegion/von-duprin/von-duprin_cd-series_cd98_cutsheet.pdf", manufacturer: "von-duprin", parent_company: "allegion", series: "CD Series", models_covered: ["CD98", "CD99EO", "CD98EO", "CD9947EO", "CD9927EO"] },
    { filename: "von-duprin_el-series_el99_cutsheet.pdf", path: "allegion/von-duprin/von-duprin_el-series_el99_cutsheet.pdf", manufacturer: "von-duprin", parent_company: "allegion", series: "EL Series", models_covered: ["EL99EO", "EL9947", "EL99", "EL9927", "EL98", "EL9927EO", "EL9947EO"] },
    { filename: "von-duprin_qel-series_qel98_cutsheet.pdf", path: "allegion/von-duprin/von-duprin_qel-series_qel98_cutsheet.pdf", manufacturer: "von-duprin", parent_company: "allegion", series: "QEL Series", models_covered: ["QEL9947", "QEL99", "QEL9875", "QEL9927", "QEL9947EO", "QEL98", "QEL9857", "QEL9827", "QEL98NL", "QEL9875EO", "QEL99EO"] },
    { filename: "zero_117-series_117a_cutsheet.pdf", path: "allegion/zero/zero_117-series_117a_cutsheet.pdf", manufacturer: "zero", parent_company: "allegion", series: "117 Series", models_covered: ["117D", "117A", "117S", "117SA"] },
    { filename: "zero_37-series_37a_cutsheet.pdf", path: "allegion/zero/zero_37-series_37a_cutsheet.pdf", manufacturer: "zero", parent_company: "allegion", series: "37 Series", models_covered: ["137A", "37D", "37A", "237A", "37CA"] },
    { filename: "zero_487-series_487s_cutsheet.pdf", path: "allegion/zero/zero_487-series_487s_cutsheet.pdf", manufacturer: "zero", parent_company: "allegion", series: "487 Series", models_covered: ["487S", "787BD", "487BD", "587S"] },
    { filename: "zero_77-series_77c_cutsheet.pdf", path: "allegion/zero/zero_77-series_77c_cutsheet.pdf", manufacturer: "zero", parent_company: "allegion", series: "77 Series", models_covered: ["77C", "477", "177", "77R", "77S", "77D"] },
    { filename: "zero_788-series_788a_cutsheet.pdf", path: "allegion/zero/zero_788-series_788a_cutsheet.pdf", manufacturer: "zero", parent_company: "allegion", series: "788 Series", models_covered: ["788A", "488S", "788B", "488A", "288A", "288S"] },
    { filename: "adams-rite_4500-series_4500_cutsheet.pdf", path: "assa-abloy/adams-rite/adams-rite_4500-series_4500_cutsheet.pdf", manufacturer: "adams-rite", parent_company: "assa-abloy", series: "4500 Series", models_covered: ["4500-36", "4500-46", "4700", "4500-30", "4500-40", "4500-35", "4500-25"] },
    { filename: "adams-rite_4900-series_4900_cutsheet.pdf", path: "assa-abloy/adams-rite/adams-rite_4900-series_4900_cutsheet.pdf", manufacturer: "adams-rite", parent_company: "assa-abloy", series: "4900 Series", models_covered: ["MS1950", "4900-35", "4900-36", "4900-46", "4510", "4900", "4910-46", "4710"] },
    { filename: "mckinney_t4a-series_ta2314_cutsheet.pdf", path: "assa-abloy/mckinney/mckinney_t4a-series_ta2314_cutsheet.pdf", manufacturer: "mckinney", parent_company: "assa-abloy", series: "T4A Series", models_covered: ["TA2314 4.5x4.5", "TA2714", "T4A3386", "TA2314", "TA2714 5x5"] },
    { filename: "norton-rixson_1600-series_1601_cutsheet.pdf", path: "assa-abloy/norton-rixson/norton-rixson_1600-series_1601_cutsheet.pdf", manufacturer: "norton-rixson", parent_company: "assa-abloy", series: "1600 Series", models_covered: ["1601BF", "1601", "1603", "1604", "7500 ?"] },
    { filename: "norton-rixson_7500-series_7500_cutsheet.pdf", path: "assa-abloy/norton-rixson/norton-rixson_7500-series_7500_cutsheet.pdf", manufacturer: "norton-rixson", parent_company: "assa-abloy", series: "7500 Series", models_covered: ["7500", "7500 BF", "7570", "7500/7570 ?"] },
    { filename: "rockwood_rm750-series_rm750_cutsheet.pdf", path: "assa-abloy/rockwood/rockwood_rm750-series_rm750_cutsheet.pdf", manufacturer: "rockwood", parent_company: "assa-abloy", series: "RM750 Series", models_covered: ["RM750", "RM754", "RM756", "RM755", "RM760", "RM757", "RM759", "RM758"] },
    { filename: "rockwood_rm770-series_rm771_cutsheet.pdf", path: "assa-abloy/rockwood/rockwood_rm770-series_rm771_cutsheet.pdf", manufacturer: "rockwood", parent_company: "assa-abloy", series: "RM770 Series", models_covered: ["RM772", "RM773", "RM771", "RM770"] },
    { filename: "securitron_magnalock-series_m62_cutsheet.pdf", path: "assa-abloy/securitron/securitron_magnalock-series_m62_cutsheet.pdf", manufacturer: "securitron", parent_company: "assa-abloy", series: "Magnalock Series", models_covered: ["M82", "M62", "M32", "M34", "M82D", "M62D", "M32D", "M34D"] },
    { filename: "pemko_s88d-series_s88d_cutsheet.pdf", path: "independent/pemko/pemko_s88d-series_s88d_cutsheet.pdf", manufacturer: "pemko", parent_company: "independent", series: "S88D Series", models_covered: ["S88D", "S88D 36", "S88D 48", "S88D 72", "S88D 84", "S88D 96"] },
    { filename: "pemko_411-series_411arl_cutsheet.pdf", path: "independent/pemko/pemko_411-series_411arl_cutsheet.pdf", manufacturer: "pemko", parent_company: "independent", series: "411 Series", models_covered: ["411", "411ARL", "420ARL", "420", "315CN"] },
    { filename: "pemko_292-series_292pkhg_cutsheet.pdf", path: "independent/pemko/pemko_292-series_292pkhg_cutsheet.pdf", manufacturer: "pemko", parent_company: "independent", series: "292 Series", models_covered: ["292PKC", "292PKHG", "292PK", "292A", "292D"] },
    { filename: "pemko_170-series_170a_cutsheet.pdf", path: "independent/pemko/pemko_170-series_170a_cutsheet.pdf", manufacturer: "pemko", parent_company: "independent", series: "170 Series", models_covered: ["170A", "171A", "172A", "173", "174", "175A"] },
    { filename: "pemko_18061-series_18061cnb_cutsheet.pdf", path: "independent/pemko/pemko_18061-series_18061cnb_cutsheet.pdf", manufacturer: "pemko", parent_company: "independent", series: "18061 Series", models_covered: ["18061CNB", "18061", "18062", "18063", "18064"] },
    { filename: "pemko_303-series_303as_cutsheet.pdf", path: "independent/pemko/pemko_303-series_303as_cutsheet.pdf", manufacturer: "pemko", parent_company: "independent", series: "303 Series", models_covered: ["303AS", "303AV", "303", "304", "305"] }
  ]
};
export async function searchLocalCatalogue(manufacturer, model, series, env2) {
  const normalizedMfr = normalizeManufacturerKey(manufacturer);
  const normalizedModel = model?.toUpperCase().replace(/[^A-Z0-9]/g, "") || "";
  const normalizedSeries = series?.toUpperCase().replace(/[^A-Z0-9]/g, "") || "";
  const mfrAliases = {
    "schlage": ["schlage", "sch", "allegion-schlage"],
    "von-duprin": ["von-duprin", "vonduprin", "vd", "von duprin"],
    "lcn": ["lcn", "lcn-closers"],
    "ives": ["ives", "ive"],
    "glynn-johnson": ["glynn-johnson", "glynnj", "glynn johnson", "gj"],
    "steelcraft": ["steelcraft", "sc"],
    "adams-rite": ["adams-rite", "ar", "adamsrite", "adams rite"],
    "norton-rixson": ["norton-rixson", "norton", "rixson", "nr"],
    "rockwood": ["rockwood", "rw"],
    "securitron": ["securitron", "sec"],
    "mckinney": ["mckinney", "mck"],
    "pemko": ["pemko", "pk"],
    "zero": ["zero", "zero-international"]
  };
  let matchingMfrKey = normalizedMfr;
  for (const [key, aliases] of Object.entries(mfrAliases)) {
    if (aliases.some((a) => normalizedMfr.includes(a.replace(/[^a-z0-9]/g, "")))) {
      matchingMfrKey = key;
      break;
    }
  }
  let bestMatch = null;
  let bestConfidence = 0;
  for (const entry of LOCAL_CATALOGUE_INDEX.files) {
    const entryMfr = entry.manufacturer.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (entryMfr !== matchingMfrKey.replace(/[^a-z0-9]/g, "")) {
      continue;
    }
    const modelMatch = entry.models_covered?.some((m) => {
      const normalizedEntryModel = m.toUpperCase().replace(/[^A-Z0-9]/g, "");
      return normalizedModel === normalizedEntryModel || normalizedModel.includes(normalizedEntryModel) || normalizedEntryModel.includes(normalizedModel);
    });
    if (modelMatch) {
      const confidence = 0.95;
      if (confidence > bestConfidence) {
        bestConfidence = confidence;
        bestMatch = {
          path: entry.path,
          filename: entry.filename,
          manufacturer: entry.manufacturer,
          parent_company: entry.parent_company,
          series: entry.series,
          models_covered: entry.models_covered,
          confidence,
          matchType: "exact_model"
        };
      }
    } else if (normalizedSeries) {
      const entrySeries = entry.series?.toUpperCase().replace(/[^A-Z0-9]/g, "") || "";
      if (normalizedSeries.includes(entrySeries) || entrySeries.includes(normalizedSeries)) {
        const confidence = 0.85;
        if (confidence > bestConfidence) {
          bestConfidence = confidence;
          bestMatch = {
            path: entry.path,
            filename: entry.filename,
            manufacturer: entry.manufacturer,
            parent_company: entry.parent_company,
            series: entry.series,
            models_covered: entry.models_covered,
            confidence,
            matchType: "series_match"
          };
        }
      }
    }
  }
  if (bestMatch) {
    await logDiscoveryTelemetry(env2, {
      name: "local_catalogue_hit",
      severity: "info",
      message: `Local catalogue match: ${bestMatch.path}`,
      context: {
        manufacturer,
        model,
        matchType: bestMatch.matchType,
        confidence: bestMatch.confidence,
        path: bestMatch.path
      }
    });
  }
  return bestMatch;
}
export var robotsCache = /* @__PURE__ */ new Map();
export async function isAllowedByRobots(url, env2) {
  try {
    const parsedUrl = new URL(url);
    const robotsUrl = `${parsedUrl.protocol}//${parsedUrl.host}/robots.txt`;
    const cacheKey = `robots:${parsedUrl.host}`;
    let robotsTxt = robotsCache.get(cacheKey);
    if (!robotsTxt) {
      if (env2.CACHE) {
        robotsTxt = await env2.CACHE.get(cacheKey);
      }
      if (!robotsTxt) {
        const response = await fetch(robotsUrl, {
          headers: { "User-Agent": "SubX-CutSheetBot/1.0 (+https://weylandai.com/bot)" }
        });
        if (response.ok) {
          robotsTxt = await response.text();
          if (env2.CACHE) {
            await env2.CACHE.put(cacheKey, robotsTxt, { expirationTtl: 86400 });
          }
          robotsCache.set(cacheKey, robotsTxt);
        } else {
          return true;
        }
      }
    }
    const lines = robotsTxt.split("\n");
    let applies = false;
    for (const line of lines) {
      const trimmed = line.trim().toLowerCase();
      if (trimmed.startsWith("user-agent:")) {
        const agent = trimmed.substring(11).trim();
        applies = agent === "*" || agent.includes("subx") || agent.includes("bot");
      } else if (applies && trimmed.startsWith("disallow:")) {
        const path = trimmed.substring(9).trim();
        if (path && parsedUrl.pathname.startsWith(path)) {
          return false;
        }
      }
    }
    return true;
  } catch (error4) {
    console.error("[Robots] Error:", error4.message);
    return true;
  }
}
export var CLOUDFLARE_PROTECTED_DOMAINS = [
  "us.allegion.com",
  "allegion.com",
  "schlage.com",
  "lcnclosers.com",
  "iveshardware.com",
  "vonduprin.com"
];
export function isCloudflareProtected(url) {
  try {
    const hostname = new URL(url).hostname;
    return CLOUDFLARE_PROTECTED_DOMAINS.some((d) => hostname.includes(d));
  } catch {
    return false;
  }
}
export async function checkVerifiedUrls(manufacturer, model, seriesName, env2) {
  if (!env2?.DB) {
    console.log("[Discovery] No DB binding - skipping verified URL lookup");
    return null;
  }
  const mfrKey = normalizeManufacturerKey(manufacturer);
  try {
    const seriesPrefix = seriesName ? seriesName.replace(/-Series$/i, "").replace(/Series$/i, "") : null;
    const result = await env2.DB.prepare(`
      SELECT
        pd.document_url,
        pd.updated_at as verified_at,
        pd.notes,
        p.product_series,
        p.base_model,
        m.name as manufacturer_name,
        m.slug as manufacturer_slug,
        mb.brand_name as matched_brand
      FROM product_documents pd
      LEFT JOIN products p ON pd.product_id = p.id
      LEFT JOIN manufacturers m ON p.manufacturer_id = m.id
      LEFT JOIN manufacturer_brands mb ON mb.parent_manufacturer_id = m.id
      WHERE pd.document_type = 'cut_sheet'
        AND pd.verified = 1
        AND (pd.active = 1 OR pd.active IS NULL)
        AND (
          m.slug = ?                    -- Direct manufacturer match
          OR mb.brand_slug = ?          -- Brand alias match (e.g., schlage -> allegion)
          OR pd.document_url LIKE '%' || ? || '%'  -- URL contains manufacturer
        )
        AND (
          ? IS NULL
          OR p.product_series LIKE ? || '%'  -- Series prefix match (e.g., L matches L9040)
          OR p.product_series IS NULL
          OR pd.document_url LIKE '%' || ? || '%'  -- URL contains series name
        )
      ORDER BY
        CASE
          WHEN m.slug = ? THEN 0        -- Exact manufacturer match first
          WHEN mb.brand_slug = ? THEN 1 -- Brand match second
          ELSE 2                        -- URL match last
        END,
        CASE WHEN p.product_series LIKE ? || '%' THEN 0 ELSE 1 END,
        pd.updated_at DESC
      LIMIT 1
    `).bind(
      mfrKey,
      // m.slug = ?
      mfrKey,
      // mb.brand_slug = ?
      mfrKey,
      // document_url LIKE manufacturer
      seriesPrefix,
      // ? IS NULL
      seriesPrefix,
      // product_series LIKE prefix%
      seriesName,
      // document_url LIKE series name
      mfrKey,
      // ORDER BY m.slug = ?
      mfrKey,
      // ORDER BY mb.brand_slug = ?
      seriesPrefix
      // ORDER BY product_series LIKE
    ).first();
    if (result && result.document_url) {
      const url = result.document_url;
      const matchType = result.matched_brand ? `brand:${result.matched_brand}` : `manufacturer:${result.manufacturer_slug}`;
      console.log(`[Discovery] LEARNING LOOP: Found verified URL via ${matchType}: ${url}`);
      console.log(`[Discovery] Verified at: ${result.verified_at}, Series: ${result.product_series || "N/A"}`);
      return {
        url,
        confidence: 0.99,
        // Highest confidence - user verified
        source: "database_verified",
        strategy: "database_verified",
        series: result.product_series,
        baseModel: result.base_model,
        manufacturer: result.manufacturer_name || manufacturer,
        verifiedAt: result.verified_at,
        matchedVia: matchType,
        note: "Previously verified by user - learning loop recall"
      };
    }
    console.log(`[Discovery] No verified URLs found in database for ${mfrKey}/${seriesName || "any series"}`);
    return null;
  } catch (error4) {
    console.error("[Discovery] Database lookup error:", error4.message);
    return null;
  }
}
export async function trySmartDirectUrls(manufacturer, model, env2, browser = null, userId = null) {
  const mfrKey = normalizeManufacturerKey(manufacturer);
  const parsed = parseModelString(model, manufacturer);
  if (userId) {
    const userCacheResult = await checkUserAffirmedCache(manufacturer, model, userId, env2);
    if (userCacheResult.found) {
      console.log(`[Discovery] USER CACHE HIT: ${userCacheResult.r2Key} (confidence: 1.0)`);
      return {
        url: `/api/cps/catalogues/${userCacheResult.catalogueId}/pages/${userCacheResult.pageStart}/render`,
        strategy: "user_affirmed_cache",
        confidence: userCacheResult.confidence,
        source: "user_affirmed_cache",
        contentType: "application/pdf",
        manufacturer: mfrKey,
        seriesMatch: parsed.series,
        modelMatch: parsed.baseModel,
        catalogueId: userCacheResult.catalogueId,
        pageStart: userCacheResult.pageStart,
        pageEnd: userCacheResult.pageEnd,
        r2Key: userCacheResult.r2Key,
        note: `User-affirmed cache hit (affirmed: ${userCacheResult.affirmedAt})`
      };
    }
  }
  const verifiedResult = await checkVerifiedUrls(manufacturer, model, parsed.series, env2);
  if (verifiedResult) {
    return {
      url: verifiedResult.url,
      strategy: verifiedResult.strategy,
      confidence: verifiedResult.confidence,
      source: verifiedResult.source,
      contentType: "application/pdf",
      manufacturer: mfrKey,
      seriesMatch: verifiedResult.series || parsed.series,
      modelMatch: verifiedResult.baseModel || parsed.baseModel,
      note: verifiedResult.note
    };
  }
  const cpsResult = await searchCPSCatalogue(manufacturer, model, env2);
  if (cpsResult.found) {
    console.log(`[Discovery] CPS catalogue hit: ${cpsResult.catalogueId} (confidence: ${cpsResult.confidence})`);
    const cacheKey = `${mfrKey}_${parsed.baseModel || model}`.toLowerCase().replace(/[^a-z0-9]/g, "_");
    const extractionUrl = `/api/cps/extractions/${cpsResult.catalogueId}/${cacheKey}`;
    return {
      url: extractionUrl,
      strategy: "cps_catalogue",
      confidence: cpsResult.confidence,
      source: "cps_catalogue",
      contentType: "application/json",
      // CPS returns structured data
      manufacturer: cpsResult.manufacturer || mfrKey,
      seriesMatch: parsed.series,
      modelMatch: cpsResult.modelNumber || parsed.baseModel,
      catalogueId: cpsResult.catalogueId,
      catalogueName: cpsResult.catalogueName,
      mappingId: cpsResult.mappingId,
      pages: cpsResult.pages,
      pageStart: cpsResult.pageStart,
      pageEnd: cpsResult.pageEnd,
      note: `CPS catalogue match: ${cpsResult.catalogueName || cpsResult.catalogueId}`
    };
  }
  const localCatalogueResult = await searchLocalCatalogue(manufacturer, model, parsed.series, env2);
  if (localCatalogueResult) {
    console.log(`[Discovery] Local catalogue hit: ${localCatalogueResult.path}`);
    return {
      url: `cutsheet-library/${localCatalogueResult.path}`,
      strategy: "local_catalogue",
      confidence: localCatalogueResult.confidence,
      source: "cutsheet_library",
      contentType: "application/pdf",
      manufacturer: localCatalogueResult.manufacturer,
      seriesMatch: localCatalogueResult.series,
      modelMatch: model,
      parentCompany: localCatalogueResult.parent_company,
      matchType: localCatalogueResult.matchType,
      note: `Local catalogue match (${localCatalogueResult.matchType}): ${localCatalogueResult.filename}`
    };
  }
  if (isAllegionBrand(manufacturer)) {
    const brandKey = findBrandByAlias(manufacturer);
    const allegionUrls = generateAllegionUrls(manufacturer, model);
    console.log(`[Discovery] Allegion brand detected: ${brandKey}, ${allegionUrls.length} URLs generated`);
    for (const candidate of allegionUrls) {
      try {
        const headResponse = await fetch(candidate.url, {
          method: "GET",
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/pdf,*/*",
            "Range": "bytes=0-1023"
            // Only get first 1KB to check if file exists
          }
        });
        if ((headResponse.ok || headResponse.status === 206) && headResponse.headers.get("content-type")?.includes("pdf")) {
          console.log(`[Discovery] Allegion URL verified: ${candidate.url}`);
          await logDiscoveryTelemetry(env2, {
            name: "url_validation_success",
            severity: "info",
            message: `URL verified: ${candidate.url}`,
            context: { url: candidate.url, manufacturer: brandKey, status: headResponse.status, strategy: "allegion_registry" }
          });
          return {
            url: candidate.url,
            strategy: "allegion_registry_verified",
            confidence: candidate.confidence,
            source: candidate.source,
            contentType: "application/pdf",
            manufacturer: brandKey,
            seriesMatch: candidate.series,
            modelMatch: parsed.baseModel,
            brand: candidate.brand,
            note: `From Allegion Registry (${candidate.brand} ${candidate.series}) - VERIFIED`
          };
        } else {
          console.log(`[Discovery] Allegion URL returned ${headResponse.status}: ${candidate.url}`);
          await logDiscoveryTelemetry(env2, {
            name: "url_validation_failed",
            severity: "warning",
            message: `URL returned ${headResponse.status}: ${candidate.url}`,
            context: { url: candidate.url, manufacturer: brandKey, status: headResponse.status, strategy: "allegion_registry" }
          });
        }
      } catch (e) {
        console.log(`[Discovery] Allegion URL check failed: ${e.message}`);
        await logDiscoveryTelemetry(env2, {
          name: "url_validation_error",
          severity: "error",
          message: `URL check failed: ${e.message}`,
          context: { url: candidate.url, manufacturer: brandKey, error: e.message, strategy: "allegion_registry" }
        });
      }
    }
    console.log(`[Discovery] No Allegion Registry URLs verified, trying other strategies...`);
    await logDiscoveryTelemetry(env2, {
      name: "allegion_registry_exhausted",
      severity: "info",
      message: `No Allegion URLs verified for ${manufacturer} ${model}`,
      context: { manufacturer, model, urls_tried: allegionUrls.length }
    });
  }
  const config3 = EXPANDED_URL_PATTERNS[mfrKey];
  if (!config3) {
    console.log(`[Discovery] No URL patterns for manufacturer: ${manufacturer}`);
    return null;
  }
  const variants = generateSearchVariants(model, manufacturer);
  console.log(`[Discovery] Parsed "${model}" -> base: ${parsed.baseModel}, series: ${parsed.series}, mfr: ${mfrKey}`);
  console.log(`[Discovery] Variants: ${variants.slice(0, 5).join(", ")}${variants.length > 5 ? "..." : ""}`);
  const urlCandidates = generateSmartUrls(manufacturer, model, {
    baseModel: parsed.baseModel,
    series: parsed.series,
    variants
  });
  console.log(`[Discovery] Generated ${urlCandidates.length} URL candidates`);
  if (urlCandidates.length > 0) {
    console.log(`[Discovery] Top candidate: ${urlCandidates[0].url} (source: ${urlCandidates[0].source}, confidence: ${urlCandidates[0].confidence})`);
  }
  urlCandidates.sort((a, b) => b.confidence - a.confidence);
  for (const candidate of urlCandidates.slice(0, 20)) {
    try {
      const isTrustedSource = candidate.source === "direct_series_url" || candidate.source === "direct_series_url_from_model" || candidate.source === "database_verified";
      if (isCloudflareProtected(candidate.url)) {
        try {
          const verifyResponse = await fetch(candidate.url, {
            method: "GET",
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              "Accept": "application/pdf,*/*",
              "Range": "bytes=0-1023"
            }
          });
          if ((verifyResponse.ok || verifyResponse.status === 206) && verifyResponse.headers.get("content-type")?.includes("pdf")) {
            console.log(`[Discovery] Verified URL: ${candidate.url} (source: ${candidate.source})`);
            return {
              url: candidate.url,
              strategy: isTrustedSource ? "trusted_direct_url_verified" : "pattern_url_verified",
              confidence: candidate.confidence,
              source: candidate.source,
              contentType: "application/pdf",
              manufacturer: mfrKey,
              seriesMatch: parsed.series,
              modelMatch: parsed.baseModel,
              note: "URL verified via HTTP response"
            };
          } else {
            console.log(`[Discovery] URL returned ${verifyResponse.status}: ${candidate.url}`);
          }
        } catch (verifyError) {
          console.log(`[Discovery] URL verify failed: ${verifyError.message}`);
        }
        console.log(`[Discovery] Cloudflare protected site, trying with Puppeteer: ${candidate.url}`);
        if (browser) {
          const result = await verifyPdfWithPuppeteer(browser, candidate.url, parsed, mfrKey, candidate);
          if (result)
            return result;
        } else {
          console.log(`[Discovery] Skipping (no browser): ${candidate.url}`);
          continue;
        }
      }
      if (!await isAllowedByRobots(candidate.url, env2)) {
        console.log(`[Discovery] Blocked by robots.txt: ${candidate.url}`);
        continue;
      }
      const response = await fetch(candidate.url, {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "application/pdf,*/*",
          "Range": "bytes=0-1023"
          // Only get first 1KB to verify
        },
        redirect: "follow"
      });
      if (response.ok || response.status === 206) {
        const contentType = response.headers.get("content-type") || "";
        const contentRange = response.headers.get("content-range");
        const contentLength = response.headers.get("content-length");
        let fileSize = null;
        if (contentRange) {
          const match = contentRange.match(/\/(\d+)/);
          if (match)
            fileSize = parseInt(match[1]);
        }
        const firstBytes = new Uint8Array(await response.arrayBuffer());
        const isPdf = firstBytes[0] === 37 && firstBytes[1] === 80 && firstBytes[2] === 68 && firstBytes[3] === 70;
        if (isPdf || contentType.includes("pdf")) {
          console.log(`[Discovery] Direct URL hit: ${candidate.url} (${fileSize || "unknown"} bytes)`);
          return {
            url: response.url,
            originalUrl: candidate.url,
            strategy: "smart_direct_url",
            confidence: candidate.confidence,
            source: candidate.source,
            contentType,
            contentLength: fileSize || (contentLength ? parseInt(contentLength) : null),
            manufacturer: mfrKey,
            seriesMatch: parsed.series,
            modelMatch: parsed.baseModel
          };
        }
      } else {
        console.log(`[Discovery] URL check failed: ${candidate.url} - ${response.status}`);
      }
    } catch (error4) {
      console.log(`[Discovery] URL error: ${candidate.url} - ${error4.message}`);
    }
  }
  return null;
}
export async function verifyPdfWithPuppeteer(browser, url, parsed, mfrKey, candidate) {
  let page = null;
  try {
    page = await browser.newPage();
    let isPdfResponse = false;
    let contentLength = null;
    await page.setRequestInterception(true);
    page.on("request", (request2) => {
      request2.continue();
    });
    page.on("response", (response2) => {
      if (response2.url() === url || response2.url().includes(url)) {
        const contentType2 = response2.headers()["content-type"] || "";
        if (contentType2.includes("pdf")) {
          isPdfResponse = true;
          contentLength = response2.headers()["content-length"];
        }
      }
    });
    const response = await page.goto(url, {
      waitUntil: "networkidle0",
      timeout: 3e4
    });
    if (!response) {
      console.log(`[Discovery] Puppeteer: No response for ${url}`);
      return null;
    }
    const status = response.status();
    const contentType = response.headers()["content-type"] || "";
    console.log(`[Discovery] Puppeteer response: ${url} - status ${status}, type: ${contentType}`);
    if (status === 200 && (isPdfResponse || contentType.includes("pdf"))) {
      console.log(`[Discovery] Puppeteer PDF hit: ${url}`);
      return {
        url,
        strategy: "puppeteer_verified",
        confidence: candidate.confidence,
        source: candidate.source,
        contentType: "application/pdf",
        contentLength: contentLength ? parseInt(contentLength) : null,
        manufacturer: mfrKey,
        seriesMatch: parsed.series,
        modelMatch: parsed.baseModel
      };
    }
    const pageContent = await page.content();
    if (pageContent.includes("challenge-platform") || pageContent.includes("cf-challenge")) {
      console.log(`[Discovery] Puppeteer: Cloudflare challenge detected for ${url}`);
      await new Promise((r) => setTimeout(r, 5e3));
      const finalUrl = page.url();
      const finalResponse = await page.goto(finalUrl, { waitUntil: "networkidle0", timeout: 15e3 });
      if (finalResponse) {
        const finalContentType = finalResponse.headers()["content-type"] || "";
        if (finalContentType.includes("pdf")) {
          return {
            url: finalUrl,
            strategy: "puppeteer_cf_bypass",
            confidence: candidate.confidence * 0.9,
            source: candidate.source,
            contentType: "application/pdf",
            manufacturer: mfrKey,
            seriesMatch: parsed.series,
            modelMatch: parsed.baseModel
          };
        }
      }
    }
    return null;
  } catch (error4) {
    console.log(`[Discovery] Puppeteer error: ${url} - ${error4.message}`);
    return null;
  } finally {
    if (page) {
      try {
        await page.close();
      } catch (e) {
      }
    }
  }
}
export async function tryAllegionEnumerationWithPuppeteer(browser, manufacturer, model, env2) {
  const mfrKey = normalizeManufacturerKey(manufacturer);
  const allegionBrands = ["schlage", "lcn", "ives", "vonduprin"];
  if (!allegionBrands.includes(mfrKey)) {
    return null;
  }
  if (!browser) {
    console.log(`[Discovery] Allegion enumeration skipped - no browser available`);
    return null;
  }
  const parsed = parseModelString(model, manufacturer);
  const config3 = EXPANDED_URL_PATTERNS[mfrKey];
  if (!config3?.directSeriesUrls) {
    return null;
  }
  let seriesKey = null;
  for (const [prefix, name] of Object.entries(config3.seriesNames || {})) {
    if (parsed.baseModel && parsed.baseModel.toUpperCase().startsWith(prefix.toUpperCase())) {
      seriesKey = name;
      break;
    }
  }
  if (!seriesKey) {
    return null;
  }
  const directUrl = config3.directSeriesUrls[seriesKey];
  if (!directUrl) {
    return null;
  }
  console.log(`[Discovery] Trying Allegion URL with Puppeteer for ${seriesKey}: ${directUrl}`);
  const result = await verifyPdfWithPuppeteer(browser, directUrl, parsed, mfrKey, {
    confidence: 0.98,
    source: "allegion_direct_puppeteer"
  });
  if (result) {
    result.seriesKey = seriesKey;
    result.strategy = "allegion_puppeteer";
    return result;
  }
  return null;
}
export async function searchManufacturerSite(browser, manufacturer, model, catalogNumber, env2) {
  const mfrKey = normalizeManufacturerKey(manufacturer);
  const config3 = EXPANDED_URL_PATTERNS[mfrKey];
  if (!config3?.searchUrl) {
    return [];
  }
  const queries = generateSearchQueries(model, manufacturer);
  const candidates = [];
  let page;
  try {
    page = await browser.newPage();
    await page.setUserAgent("SubX-CutSheetBot/1.0 (+https://weylandai.com/bot)");
    for (const query of queries.slice(0, 3)) {
      const searchUrl = config3.searchUrl.replace("{query}", encodeURIComponent(query));
      console.log(`[Discovery] Searching: ${searchUrl}`);
      try {
        await page.goto(searchUrl, { waitUntil: "networkidle2", timeout: 15e3 });
        const pdfLinks = await page.evaluate(() => {
          const links = Array.from(document.querySelectorAll('a[href*=".pdf"], a[href*="pdf"]'));
          return links.map((a) => ({
            url: a.href,
            text: a.textContent?.trim() || "",
            title: a.title || ""
          })).filter((l) => l.url.includes(".pdf"));
        });
        for (const link2 of pdfLinks) {
          if (config3.domains?.some((d) => link2.url.includes(d))) {
            candidates.push({
              url: link2.url,
              title: link2.text || link2.title,
              strategy: "site_search",
              confidence: 0.7,
              query
            });
          }
        }
        if (candidates.length >= 5)
          break;
      } catch (searchError) {
        console.log(`[Discovery] Search failed: ${searchError.message}`);
      }
    }
  } finally {
    if (page)
      await page.close();
  }
  return candidates;
}
export async function googleSiteSearch(browser, manufacturer, model, verifiedDomains, env2) {
  if (!verifiedDomains?.length) {
    return [];
  }
  const candidates = [];
  const parsed = parseModelString(model, manufacturer);
  const siteRestriction = verifiedDomains.slice(0, 3).map((d) => `site:${d}`).join(" OR ");
  const searchQuery = `${manufacturer} ${parsed.baseModel} cut sheet filetype:pdf (${siteRestriction})`;
  const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
  let page;
  try {
    page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
    await page.goto(googleUrl, { waitUntil: "networkidle2", timeout: 2e4 });
    const results = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll("a"));
      return links.filter((a) => a.href && a.href.includes(".pdf")).map((a) => ({ url: a.href, text: a.textContent?.trim() })).slice(0, 10);
    });
    for (const result of results) {
      let pdfUrl = result.url;
      if (pdfUrl.includes("google.com/url")) {
        try {
          const parsed2 = new URL(pdfUrl);
          pdfUrl = parsed2.searchParams.get("url") || pdfUrl;
        } catch (e) {
        }
      }
      if (verifiedDomains.some((d) => pdfUrl.includes(d))) {
        candidates.push({
          url: pdfUrl,
          title: result.text,
          strategy: "google_site_search",
          confidence: 0.6
        });
      }
    }
  } catch (error4) {
    console.log(`[Discovery] Google search failed: ${error4.message}`);
  } finally {
    if (page)
      await page.close();
  }
  return candidates;
}
export async function discoverCutSheets(browser, component, verifiedDomains, env2) {
  const { manufacturer, model, catalog_number } = component;
  const candidates = [];
  console.log(`[Discovery] Starting: ${manufacturer} ${model}`);
  const directResult = await trySmartDirectUrls(manufacturer, model, env2, browser);
  if (directResult) {
    candidates.push(directResult);
  }
  if (candidates.length === 0) {
    const allegionResult = await tryAllegionEnumerationWithPuppeteer(browser, manufacturer, model, env2);
    if (allegionResult) {
      candidates.push(allegionResult);
    }
  }
  if (browser && candidates.filter((c) => c.confidence >= 0.8).length === 0) {
    console.log(`[Discovery] Running browser strategies...`);
    const siteResults = await searchManufacturerSite(
      browser,
      manufacturer,
      model,
      catalog_number,
      env2
    );
    candidates.push(...siteResults);
    if (candidates.length < 3 && verifiedDomains?.length > 0) {
      const googleResults = await googleSiteSearch(
        browser,
        manufacturer,
        model,
        verifiedDomains.map((d) => d.domain || d),
        env2
      );
      candidates.push(...googleResults);
    }
  }
  const seen = /* @__PURE__ */ new Set();
  const unique = candidates.filter((c) => {
    const normalized = c.url.toLowerCase().replace(/\/$/, "");
    if (seen.has(normalized))
      return false;
    seen.add(normalized);
    return true;
  });
  unique.sort((a, b) => b.confidence - a.confidence);
  console.log(`[Discovery] Found ${unique.length} unique candidates`);
  return unique.slice(0, 5);
}
export async function processDiscoveryMessage(message, browser, env2) {
  const {
    queueItemId,
    componentId,
    manufacturer,
    model,
    catalogNumber,
    verifiedDomains
  } = message;
  const startTime = Date.now();
  try {
    await env2.DB.prepare(`
      UPDATE cut_sheet_discovery_queue
      SET status = 'processing', last_attempt_at = datetime('now'), attempts = attempts + 1
      WHERE id = ?
    `).bind(queueItemId).run();
    const candidates = await discoverCutSheets(
      browser,
      { manufacturer, model, catalog_number: catalogNumber },
      verifiedDomains,
      env2
    );
    const processingTime = Date.now() - startTime;
    if (candidates.length === 0) {
      await env2.DB.prepare(`
        UPDATE cut_sheet_discovery_queue
        SET status = 'processed', processed_at = datetime('now'),
            error_message = 'No candidates found'
        WHERE id = ?
      `).bind(queueItemId).run();
      return { success: true, found: 0, queueItemId, processingTime };
    }
    console.log(`[Discovery] Validating ${candidates.length} candidates...`);
    let validatedCandidates = candidates;
    try {
      validatedCandidates = await validateCandidates(
        candidates,
        { manufacturer, model, catalog_number: catalogNumber },
        env2,
        3
      );
    } catch (validationError) {
      console.log(`[Discovery] Validation skipped: ${validationError.message}`);
      validatedCandidates = candidates.slice(0, 3).map((c) => ({
        ...c,
        matchesExpected: true,
        matchScore: c.confidence
      }));
    }
    if (validatedCandidates.length === 0) {
      await env2.DB.prepare(`
        UPDATE cut_sheet_discovery_queue
        SET status = 'processed', processed_at = datetime('now'),
            error_message = 'Candidates found but none validated'
        WHERE id = ?
      `).bind(queueItemId).run();
      return { success: true, found: candidates.length, validated: 0, queueItemId, processingTime };
    }
    let stored = 0;
    for (const candidate of validatedCandidates) {
      try {
        const discoveryId = crypto.randomUUID();
        await env2.DB.prepare(`
          INSERT INTO cut_sheet_discoveries (
            id, component_id, queue_item_id, source_url, source_domain,
            document_title, document_type, file_size_bytes, page_count,
            extracted_metadata, extraction_confidence, matches_expected,
            temp_r2_key, file_hash_sha256, status, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_review', datetime('now'))
        `).bind(
          discoveryId,
          componentId || null,
          queueItemId,
          candidate.url,
          new URL(candidate.url).hostname,
          candidate.metadata?.productName || candidate.title || null,
          candidate.metadata?.documentType || "cut_sheet",
          candidate.fileSize || candidate.contentLength || null,
          candidate.metadata?.pageCount || null,
          JSON.stringify({
            strategy: candidate.strategy,
            confidence: candidate.confidence,
            source: candidate.source,
            seriesMatch: candidate.seriesMatch,
            modelMatch: candidate.modelMatch,
            claudeAnalysis: candidate.metadata,
            processingTime
          }),
          candidate.confidence,
          candidate.matchesExpected ? 1 : 0,
          candidate.tempR2Key || null,
          candidate.hash || null
        ).run();
        stored++;
        console.log(`[Discovery] Stored: ${candidate.url}`);
      } catch (err) {
        console.error(`[Discovery] Store failed: ${err.message}`);
      }
    }
    await env2.DB.prepare(`
      UPDATE cut_sheet_discovery_queue
      SET status = 'processed', processed_at = datetime('now')
      WHERE id = ?
    `).bind(queueItemId).run();
    return { success: true, found: stored, queueItemId, processingTime };
  } catch (error4) {
    console.error(`[Discovery] Failed: ${error4.message}`);
    await env2.DB.prepare(`
      UPDATE cut_sheet_discovery_queue
      SET status = 'failed', error_message = ?
      WHERE id = ?
    `).bind(error4.message, queueItemId).run();
    return { success: false, error: error4.message, queueItemId };
  }
}

export var RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelayMs: 1e3,
  maxDelayMs: 3e4,
  backoffMultiplier: 2,
  // Strategy fallback order
  strategyOrder: [
    "verified_db",
    // Check database first (learned URLs)
    "smart_direct",
    // Try smart URL patterns
    "puppeteer",
    // Use Puppeteer for Cloudflare sites
    "site_search",
    // Search manufacturer site
    "google_search"
    // Last resort: Google site: search
  ],
  // Errors that should NOT be retried
  permanentErrors: [
    "PRODUCT_NOT_FOUND",
    "MANUFACTURER_NOT_SUPPORTED",
    "INVALID_MODEL_NUMBER",
    "ACCESS_DENIED"
    // True 403, not Cloudflare challenge
  ],
  // Errors that SHOULD trigger strategy switch
  switchStrategyErrors: [
    "CLOUDFLARE_BLOCKED",
    "RATE_LIMITED",
    "403",
    "429",
    "TIMEOUT"
  ]
};
export function calculateBackoffDelay(attempt) {
  const delay = RETRY_CONFIG.baseDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt);
  const jitter = delay * 0.25 * (Math.random() * 2 - 1);
  return Math.min(delay + jitter, RETRY_CONFIG.maxDelayMs);
}
export function sleep(ms) {
  return new Promise((resolve2) => setTimeout(resolve2, ms));
}
export function isPermanentError(error4) {
  const errorStr = String(error4.message || error4).toUpperCase();
  return RETRY_CONFIG.permanentErrors.some((pe) => errorStr.includes(pe));
}
export function shouldSwitchStrategy(error4) {
  const errorStr = String(error4.message || error4).toUpperCase();
  return RETRY_CONFIG.switchStrategyErrors.some((se) => errorStr.includes(se));
}
export async function discoverWithRetry(component, env2, options = {}) {
  const startTime = Date.now();
  const retryLog = [];
  let lastError = null;
  let currentStrategyIndex = 0;
  const maxAttempts = options.maxAttempts || RETRY_CONFIG.maxAttempts;
  console.log(`[Retry] Starting discovery for ${component.manufacturer} ${component.model}`);
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const strategy = RETRY_CONFIG.strategyOrder[currentStrategyIndex];
    console.log(`[Retry] Attempt ${attempt + 1}/${maxAttempts} using strategy: ${strategy}`);
    const attemptStart = Date.now();
    const logEntry = {
      attempt: attempt + 1,
      strategy,
      attemptedAt: (/* @__PURE__ */ new Date()).toISOString(),
      succeeded: false
    };
    try {
      let result = null;
      switch (strategy) {
        case "verified_db":
          result = { success: false, error: "DB check handled externally" };
          break;
        case "smart_direct":
          result = await trySmartDirectUrls(
            component.manufacturer,
            component.model,
            env2,
            options.browser || null
          );
          break;
        case "puppeteer":
          if (isCloudflareProtected(component.manufacturer)) {
            result = await trySmartDirectUrls(
              component.manufacturer,
              component.model,
              env2,
              options.browser || null
            );
          } else {
            result = { success: false, error: "Not Cloudflare protected" };
          }
          break;
        case "site_search":
          result = await searchManufacturerSite(
            component.manufacturer,
            component.model,
            env2,
            options.browser || null
          );
          break;
        case "google_search":
          result = await googleSiteSearch(
            component.manufacturer,
            component.model,
            env2
          );
          break;
        default:
          result = { success: false, error: `Unknown strategy: ${strategy}` };
      }
      if (result && !result.success && result.url) {
        result.success = true;
      }
      if (result && result.confidence === void 0 && result.url) {
        result.confidence = 0.7;
      }
      logEntry.durationMs = Date.now() - attemptStart;
      if (result && result.success && result.url) {
        logEntry.succeeded = true;
        logEntry.resultUrl = result.url;
        retryLog.push(logEntry);
        await logRetryAttempt(env2, component, logEntry);
        console.log(`[Retry] Success on attempt ${attempt + 1}: ${result.url}`);
        return {
          ...result,
          retryAttempts: attempt + 1,
          finalStrategy: strategy,
          retryLog
        };
      }
      logEntry.errorMessage = result.error || "No URL found";
      retryLog.push(logEntry);
      lastError = new Error(logEntry.errorMessage);
    } catch (error4) {
      logEntry.durationMs = Date.now() - attemptStart;
      logEntry.errorMessage = error4.message;
      logEntry.httpStatus = error4.status || error4.statusCode;
      retryLog.push(logEntry);
      lastError = error4;
      await logRetryAttempt(env2, component, logEntry);
      if (isPermanentError(error4)) {
        console.log(`[Retry] Permanent error, stopping: ${error4.message}`);
        break;
      }
      if (shouldSwitchStrategy(error4)) {
        if (currentStrategyIndex < RETRY_CONFIG.strategyOrder.length - 1) {
          currentStrategyIndex++;
          console.log(`[Retry] Switching to strategy: ${RETRY_CONFIG.strategyOrder[currentStrategyIndex]}`);
        }
      }
    }
    if (attempt < maxAttempts - 1) {
      const delay = calculateBackoffDelay(attempt);
      console.log(`[Retry] Waiting ${Math.round(delay)}ms before next attempt`);
      await sleep(delay);
    }
  }
  console.log(`[Retry] All ${maxAttempts} attempts failed for ${component.manufacturer} ${component.model}`);
  return {
    success: false,
    error: lastError?.message || "All retry attempts exhausted",
    retryAttempts: retryLog.length,
    strategiesAttempted: [...new Set(retryLog.map((l) => l.strategy))],
    retryLog,
    durationMs: Date.now() - startTime
  };
}
export async function logRetryAttempt(env2, component, logEntry) {
  if (!env2?.DB)
    return;
  try {
    const id = `rtl_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const discoveryId = component.discoveryId || `${component.manufacturer}_${component.model}`;
    await env2.DB.prepare(`
      INSERT INTO discovery_retry_log (
        id, discovery_id, attempt_number, strategy_used,
        error_message, http_status, attempted_at, duration_ms,
        succeeded, result_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      discoveryId,
      logEntry.attempt,
      logEntry.strategy,
      logEntry.errorMessage || null,
      logEntry.httpStatus || null,
      logEntry.attemptedAt,
      logEntry.durationMs || null,
      logEntry.succeeded ? 1 : 0,
      logEntry.resultUrl || null
    ).run();
  } catch (e) {
    console.log(`[Retry] Failed to log attempt: ${e.message}`);
  }
}
export async function retryFailedDiscoveries(sessionId, env2) {
  if (!env2?.DB) {
    return { error: "No database connection", retried: 0 };
  }
  const failed = await env2.DB.prepare(`
    SELECT
      id, manufacturer, model, catalog_number, component_type,
      discovery_attempts, last_error
    FROM cut_sheet_discovery_queue
    WHERE session_id = ?
      AND status = 'failed'
      AND discovery_attempts < ?
  `).bind(sessionId, RETRY_CONFIG.maxAttempts).all();
  const results = {
    sessionId,
    totalFailed: failed.results?.length || 0,
    retried: 0,
    succeeded: 0,
    stillFailed: 0,
    results: []
  };
  for (const item of failed.results || []) {
    const component = {
      manufacturer: item.manufacturer,
      model: item.model,
      catalog_number: item.catalog_number,
      discoveryId: item.id
    };
    const result = await discoverWithRetry(component, env2, {
      maxAttempts: RETRY_CONFIG.maxAttempts - item.discovery_attempts
    });
    results.retried++;
    if (result.success) {
      results.succeeded++;
      await env2.DB.prepare(`
        UPDATE cut_sheet_discovery_queue
        SET status = 'discovered',
            discovered_url = ?,
            discovery_confidence = ?,
            discovery_strategy = ?,
            discovery_attempts = discovery_attempts + ?,
            last_attempt_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(
        result.url,
        result.confidence || 0.7,
        result.finalStrategy,
        result.retryAttempts,
        item.id
      ).run();
    } else {
      results.stillFailed++;
      await env2.DB.prepare(`
        UPDATE cut_sheet_discovery_queue
        SET discovery_attempts = discovery_attempts + ?,
            last_error = ?,
            last_attempt_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(
        result.retryAttempts,
        result.error,
        item.id
      ).run();
    }
    results.results.push({
      manufacturer: component.manufacturer,
      model: component.model,
      success: result.success,
      attempts: result.retryAttempts,
      strategy: result.finalStrategy
    });
  }
  console.log(`[Retry] Batch complete: ${results.succeeded}/${results.retried} recovered`);
  return results;
}

export async function getManufacturerDomains(manufacturer, env2) {
  const db = env2.DB;
  const domains = await db.prepare(`
        SELECT md.* FROM manufacturer_domains md
        JOIN manufacturers m ON md.manufacturer_id = m.id
        WHERE (m.slug = ? OR m.name LIKE ? OR m.slug LIKE ?)
          AND md.verified = 1
        ORDER BY md.priority ASC
    `).bind(
    manufacturer.toLowerCase(),
    `%${manufacturer}%`,
    `%${manufacturer.toLowerCase()}%`
  ).all();
  return domains.results || [];
}
export async function queueForDiscovery(component, userId, env2) {
  const db = env2.DB;
  const id = crypto.randomUUID();
  let componentId = component.id || null;
  if (componentId) {
    const validComponent = await db.prepare(`
            SELECT id FROM hardware_components WHERE id = ?
        `).bind(componentId).first();
    if (!validComponent) {
      console.log(`[Discovery] component_id ${componentId} not found in hardware_components, setting to NULL`);
      componentId = null;
    }
  }
  if (componentId) {
    const existing = await db.prepare(`
            SELECT id FROM cut_sheet_discovery_queue
            WHERE component_id = ? AND status IN ('pending', 'processing')
        `).bind(componentId).first();
    if (existing) {
      return { id: existing.id, status: "already_queued" };
    }
  }
  const searchTerm = component.model || component.catalog_number || "";
  if (searchTerm) {
    const hasSheet = await db.prepare(`
            SELECT pd.id FROM product_documents pd
            JOIN products p ON pd.product_id = p.id
            WHERE p.base_model LIKE ?
              AND pd.document_type = 'cut_sheet'
              AND pd.verified = 1
            LIMIT 1
        `).bind(`%${searchTerm}%`).first();
    if (hasSheet) {
      return { id: null, status: "sheet_exists", documentId: hasSheet.id };
    }
  }
  const manufacturer = component.manufacturer || component.manufacturer_code || "UNKNOWN";
  await db.prepare(`
        INSERT INTO cut_sheet_discovery_queue (
            id, component_id, manufacturer, model, catalog_number, dhi_category,
            status, priority, created_at, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, datetime('now'), ?)
    `).bind(
    id,
    componentId,
    manufacturer,
    component.model || component.model_number || null,
    component.catalog_number || null,
    component.dhi_category || component.component_type || null,
    component.priority || 5,
    userId
  ).run();
  return { id, status: "queued" };
}
export async function getDiscoveryConfig(env2) {
  const db = env2.DB;
  const configs = await db.prepare(`
        SELECT key, value FROM discovery_engine_config
    `).all();
  const config3 = {};
  for (const row of configs.results || []) {
    config3[row.key] = row.value;
  }
  return config3;
}
