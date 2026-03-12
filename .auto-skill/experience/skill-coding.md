# Coding 技能經驗庫

## 已解決的問題

### fake-useragent 反爬蟲
**問題**: 抓股價被網站阻擋
**解法**: 使用 fake-user-agent 庫偽裝瀏覽器
**關鍵參數**:
```python
from fake_useragent import UserAgent
headers = {'User-Agent': UserAgent().random}
```
**備註**: 金融網站特別嚴格，一定要加

### Python 虛擬環境
**問題**: 套件版本衝突
**解法**: 一律使用 venv
**關鍵參數**:
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Git 分支管理
**問題**: main 分支被弄亂
**解法**: 功能開發一律用 feature branch
**關鍵參數**:
```bash
git checkout -b feature/xxx
git push -u origin feature/xxx
# PR 合併後
git checkout main
git pull
git branch -d feature/xxx
```
