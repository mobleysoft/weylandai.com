#!/usr/bin/env python3
import sys
import json
import re

try:
    import fitz  # PyMuPDF
except ImportError:
    print("[-] PyMuPDF not installed. Cannot extract bare-metal CAD vectors.")
    sys.exit(1)

def extract_morningstar_schematics(pdf_path):
    print(f"[*] Initializing physical extraction matrix on: {pdf_path}")
    
    try:
        doc = fitz.open(pdf_path)
    except Exception as e:
        print(f"[-] Physical I/O Error: {e}")
        sys.exit(1)

    print(f"[+] PDF Loaded. Pages: {len(doc)}")
    
    extracted_data = {
        "doors": [],
        "rooms": [],
        "raw_text_dump": ""
    }

    # Regex patterns to hunt for structural data
    door_pattern = re.compile(r'(MS-\d+[A-Z]?|Door \d+)', re.IGNORECASE)
    dim_pattern = re.compile(r'(\d+[\'"]?\s*[xX]\s*\d+[\'"]?)')

    for page_num in range(len(doc)):
        page = doc.load_page(page_num)
        text = page.get_text("text")
        extracted_data["raw_text_dump"] += text + "\n"

        # Search for door references in the text
        lines = text.split('\n')
        for line in lines:
            if "door" in line.lower() or "schedule" in line.lower() or "precision" in line.lower():
                door_match = door_pattern.search(line)
                dim_match = dim_pattern.search(line)
                if door_match:
                    extracted_data["doors"].append({
                        "id": door_match.group(1),
                        "context": line.strip(),
                        "dimension": dim_match.group(1) if dim_match else "UNKNOWN"
                    })

        # Future: Extract raw vector paths (lines/rects) to build the 3D grid
        # paths = page.get_drawings() 
        # ... complex mathematical reconstruction of walls ...

    # Deduplicate doors
    unique_doors = {d['id']: d for d in extracted_data["doors"]}.values()
    extracted_data["doors"] = list(unique_doors)

    print(f"[+] Extraction complete. Found {len(extracted_data['doors'])} structural door references.")
    
    with open("morningstar_extracted_matrix.json", "w") as f:
        json.dump(extracted_data, f, indent=4)
    
    print("[+] Structural matrix locked to: morningstar_extracted_matrix.json")

if __name__ == "__main__":
    target = "/Users/johnmobley/Desktop/weyland-real-upload.pdf"
    extract_morningstar_schematics(target)
