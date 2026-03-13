import os
import sys
import json
from PIL import Image
from PIL.ExifTags import TAGS

def get_image_info(image_path):
    try:
        img = Image.open(image_path)
        info = {
            "filename": os.path.basename(image_path),
            "format": img.format,
            "mode": img.mode,
            "size": img.size,
            "exif": {}
        }
        
        # 嘗試提取 EXIF
        exif_data = img._getexif()
        if exif_data:
            for tag, value in exif_data.items():
                decoded = TAGS.get(tag, tag)
                if isinstance(value, bytes):
                    value = value.decode(errors='ignore')
                info["exif"][str(decoded)] = str(value)
        return info
    except Exception as e:
        return {"error": str(e), "path": image_path}

if __name__ == "__main__":
    results = []
    # 從 stdin 讀取檔案列表或從參數讀取
    paths = sys.argv[1:]
    for p in paths:
        if os.path.exists(p):
            results.append(get_image_info(p))
    
    print(json.dumps(results, indent=2, ensure_ascii=False))
