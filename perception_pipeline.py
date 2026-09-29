import os
import sys
import json
import base64
import requests
from io import BytesIO
from pdf2image import convert_from_path

VLM_ENDPOINT = "http://127.0.0.1:11435/v1/chat/completions"

def pdf_to_base64_images(pdf_path):
    try:
        images = convert_from_path(pdf_path)
    except Exception as e:
        print(f"Error converting PDF: {e}")
        sys.exit(1)
        
    base64_images = []
    for img in images:
        buffered = BytesIO()
        img.save(buffered, format="JPEG")
        img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
        base64_images.append(img_str)
    return base64_images

def extract_floorplan_data(base64_image):
    prompt = (
        "Analyze this industrial floorplan. Extract 3D wall bounding boxes and coordinates. "
        "Return strictly a JSON object with a 'walls' array. Each wall should have "
        "'start_x', 'start_z', 'end_x', 'end_z', 'height', and 'thickness'. "
        "This JSON will be parsed directly by Godot/Three.js to generate meshes."
    )
    
    payload = {
        "model": "qwen",
        "messages": [
            {
                "role": "system",
                "content": "You are a spatial ingestion engine. Output only valid JSON."
            },
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{base64_image}"
                        }
                    }
                ]
            }
        ],
        "temperature": 0.1
    }
    
    try:
        response = requests.post(VLM_ENDPOINT, json=payload)
        response.raise_for_status()
        result = response.json()
        return result['choices'][0]['message']['content']
    except Exception as e:
        print(f"Failed to query VLM: {e}")
        sys.exit(1)

def main():
    if len(sys.argv) < 2:
        print("Usage: python perception_pipeline.py <path_to_floorplan_pdf>")
        sys.exit(1)
        
    pdf_path = sys.argv[1]
    if not os.path.exists(pdf_path):
        print(f"File not found: {pdf_path}")
        sys.exit(1)
        
    print(f"[+] Ingesting PDF: {pdf_path}")
    images = pdf_to_base64_images(pdf_path)
    
    if not images:
        print("No images extracted from PDF.")
        sys.exit(1)
        
    print(f"[+] Extracted {len(images)} pages. Pinging VLM...")
    
    json_output = extract_floorplan_data(images[0])
    
    print("[+] Extraction complete. VLM Response:")
    print(json_output)
    
    output_path = f"{os.path.splitext(pdf_path)[0]}_spatial_mesh.json"
    try:
        with open(output_path, "w") as f:
            f.write(json_output)
        print(f"[+] Mesh data saved to {output_path}")
    except Exception as e:
        print(f"Failed to save output: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
