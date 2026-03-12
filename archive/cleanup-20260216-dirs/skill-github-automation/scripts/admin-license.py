#!/usr/bin/env python3
"""
SkillForge 機器綁定授權系統
管理員用於啟用/查詢/解除授權
"""

import json
import hashlib
import os
from datetime import datetime, timedelta
from pathlib import Path

class LicenseManager:
    def __init__(self, db_path="licenses.json"):
        self.db_path = Path(db_path)
        self.licenses = self.load_db()
    
    def load_db(self):
        if self.db_path.exists():
            with open(self.db_path, 'r') as f:
                return json.load(f)
        return {}
    
    def save_db(self):
        with open(self.db_path, 'w') as f:
            json.dump(self.licenses, f, indent=2)
    
    def generate_license(self, tier="lite", user_id=None, user_email=None):
        """產生新的 License Key"""
        prefix = {"lite": "SF-LT", "pro": "SF-PR", "enterprise": "SF-EN"}.get(tier, "SF-LT")
        timestamp = hex(int(datetime.now().timestamp()))[2:].upper()
        random = hashlib.sha256(os.urandom(32)).hexdigest()[:8].upper()
        
        # 產生驗證碼
        data = f"{prefix}-{timestamp}-{random}"
        secret = "skillforge-secret-key-2026"
        hash_val = hashlib.sha256(f"{data}{secret}".encode()).hexdigest()[:8].upper()
        
        license_key = f"{prefix}-{timestamp}-{random}-{hash_val}"
        
        # 儲存授權資訊
        self.licenses[license_key] = {
            "tier": tier,
            "status": "active",
            "created_at": datetime.now().isoformat(),
            "expires_at": (datetime.now() + timedelta(days=365)).isoformat(),
            "user_id": user_id,
            "user_email": user_email,
            "machine_fingerprint": None,
            "activated_at": None,
            "activations": 0,
            "max_activations": 5 if tier == "enterprise" else 1
        }
        
        self.save_db()
        return license_key
    
    def activate_license(self, license_key, machine_fingerprint):
        """啟用授權（綁定機器）"""
        if license_key not in self.licenses:
            return {"success": False, "error": "無效的 License Key"}
        
        lic = self.licenses[license_key]
        
        if lic["status"] != "active":
            return {"success": False, "error": "授權已被停用"}
        
        if lic["expires_at"] and datetime.fromisoformat(lic["expires_at"]) < datetime.now():
            return {"success": False, "error": "授權已過期"}
        
        # 檢查是否已綁定
        if lic["machine_fingerprint"]:
            if lic["machine_fingerprint"] != machine_fingerprint:
                return {
                    "success": False, 
                    "error": "此授權已綁定其他設備",
                    "solution": "請先聯繫客服解除綁定，或購買新的授權"
                }
            else:
                # 同一台機器重新驗證
                return {"success": True, "tier": lic["tier"], "message": "授權驗證成功"}
        
        # 檢查啟用次數
        if lic["activations"] >= lic["max_activations"]:
            return {"success": False, "error": "已達最大啟用次數上限"}
        
        # 綁定機器
        lic["machine_fingerprint"] = machine_fingerprint
        lic["activated_at"] = datetime.now().isoformat()
        lic["activations"] += 1
        self.save_db()
        
        return {
            "success": True, 
            "tier": lic["tier"],
            "expires_at": lic["expires_at"],
            "message": "授權啟用成功，已綁定此設備"
        }
    
    def unbind_license(self, license_key):
        """解除機器綁定"""
        if license_key not in self.licenses:
            return {"success": False, "error": "無效的 License Key"}
        
        lic = self.licenses[license_key]
        old_machine = lic["machine_fingerprint"]
        
        lic["machine_fingerprint"] = None
        lic["activated_at"] = None
        self.save_db()
        
        return {
            "success": True, 
            "message": f"已解除綁定（原設備: {old_machine[:8]}...）"
        }
    
    def get_license_info(self, license_key):
        """查詢授權資訊"""
        if license_key not in self.licenses:
            return None
        
        lic = self.licenses[license_key].copy()
        
        # 隱藏敏感資訊
        if lic["machine_fingerprint"]:
            lic["machine_fingerprint"] = lic["machine_fingerprint"][:8] + "..."
        
        return lic
    
    def list_licenses(self, user_id=None):
        """列出所有授權"""
        if user_id:
            return {k: v for k, v in self.licenses.items() if v.get("user_id") == user_id}
        return self.licenses


# CLI 介面
if __name__ == "__main__":
    import sys
    
    manager = LicenseManager()
    
    if len(sys.argv) < 2:
        print("使用方式:")
        print(f"  {sys.argv[0]} generate <tier> [user_id] [email]  - 產生新授權")
        print(f"  {sys.argv[0]} info <license_key>                    - 查詢授權資訊")
        print(f"  {sys.argv[0]} unbind <license_key>                  - 解除綁定")
        print(f"  {sys.argv[0]} list                                  - 列出所有授權")
        sys.exit(1)
    
    cmd = sys.argv[1]
    
    if cmd == "generate":
        tier = sys.argv[2] if len(sys.argv) > 2 else "lite"
        user_id = sys.argv[3] if len(sys.argv) > 3 else None
        email = sys.argv[4] if len(sys.argv) > 4 else None
        key = manager.generate_license(tier, user_id, email)
        print(f"✅ 產生授權: {key}")
        print(f"   版本: {tier}")
        print(f"   用戶: {user_id or 'N/A'}")
    
    elif cmd == "info":
        key = sys.argv[2]
        info = manager.get_license_info(key)
        if info:
            print(json.dumps(info, indent=2))
        else:
            print("❌ 找不到授權")
    
    elif cmd == "unbind":
        key = sys.argv[2]
        result = manager.unbind_license(key)
        print(result["message"] if result["success"] else result["error"])
    
    elif cmd == "list":
        licenses = manager.list_licenses()
        print(f"共 {len(licenses)} 個授權:")
        for key, info in licenses.items():
            status = "✅" if info["status"] == "active" else "❌"
            bound = "🔒已綁定" if info["machine_fingerprint"] else "🔓未啟用"
            print(f"  {status} {key} [{info['tier']}] {bound}")
