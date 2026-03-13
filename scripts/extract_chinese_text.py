import sys
import os
import subprocess

def check_dependencies():
    deps = ["pytesseract", "PIL", "paddleocr"]
    # Logic to check or suggest installation
    pass

def extract_text(image_path):
    print(f"--- Processing: {image_path} ---")
    # Method 1: Tesseract (Common)
    try:
        import pytesseract
        from PIL import Image
        text = pytesseract.image_to_string(Image.open(image_path), lang='chi_tra+chi_sim')
        return text
    except ImportError:
        return "[Error] pytesseract not installed. Please run: pip install pytesseract pillow"
    except Exception as e:
        return f"[Error] Tesseract failed: {str(e)}"

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 extract_chinese_text.py <image_path>")
        sys.exit(1)
    
    img_path = sys.argv[1]
    if os.path.exists(img_path):
        result = extract_text(img_path)
        print("--- Extracted Content ---")
        print(result)
    else:
        print(f"File {img_path} not found.")
