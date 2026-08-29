#!/usr/bin/env python3
import sys
import os
import time
import subprocess
try:
    import pyautogui
except ImportError:
    pass

# Dynamically link to the Omni-Deployed MASCOM Core
sys.path.append("/Users/johnmobley/mascom")
try:
    from mascom_somatic_interface import SomaticInterface
except ImportError:
    print("[-] MASCOM Core unreachable. Aborting.")
    sys.exit(1)

def ingest_blueprint():
    print("="*60)
    print("WEYLAND-YUTANI - PHOTONIC BLUEPRINT INGESTION")
    print("="*60)
    
    somatic = SomaticInterface()
    pdf_path = "/Users/johnmobley/weyland/PagesfromMorningstarMountainView-CompleteDraftofManual-Dated11-20-2022.pdf"
    
    print(f"[*] Command: OS open {os.path.basename(pdf_path)}")
    subprocess.run(["open", "-a", "Preview", pdf_path])
    time.sleep(2) # Wait for Preview to render the CAD files
    
    # Prove Omni-Deployment by calling the generic MASCOM Somatic method
    somatic.assert_focus("Preview")
    print("[+] Preview application biologically focused.")
    
    pages_to_scan = 3
    for page in range(1, pages_to_scan + 1):
        print(f"[*] Photonic Scan: Capturing Page {page}...")
        image_matrix = somatic.capture_photons()
        print(f"[+] Page {page} secured into local latent buffer: {image_matrix}")
        
        # In a full deployment, this is piped to vision.mobleysoft.com
        print("[*] Transmitting raw photons to Weyland Kinesthetic API for spatial rendering...")
        
        # Simulate transmitting the file to the local API
        try:
            import requests
            with open(image_matrix, 'rb') as f:
                response = requests.post("http://127.0.0.1:8893/api/v1/synthesize_mesh", files={"blueprint_image": f})
                if response.status_code == 200:
                    data = response.json()
                    print(f"[+] 3D Mesh successfully extracted and locked: {data.get('mesh_path')}")
        except Exception as e:
            print(f"[-] Kinesthetic uplink failed. Ensure the Cortex is running on port 8893. {e}")
        
        print("[*] Executing biological keypress (Right Arrow) to advance blueprint...")
        pyautogui.press('right')
        time.sleep(0.5)
        
    print("="*60)
    print("[+] Weyland-Yutani ingestion loop complete. Visual matrices locked for analysis.")

if __name__ == "__main__":
    ingest_blueprint()
