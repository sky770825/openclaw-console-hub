# OpenClaw TypeScript 指揮官實戰手冊

## 第一章：核心戰術 - 掌握 async/await 異步通訊
在後端戰場，我們的大部分行動（如資料庫查詢、讀寫檔案、呼叫第三方 API）都不是立即完成的。async/await 是我們處理這種「非同步」通訊的標準作戰協議。

### 實戰演練：獲取情報
``typescript
export async function getUserById(id: string): Promise<IUser | null> {
  try {
    const user = await UserModel.findById(id).exec();
    return user || null;
  } catch (error) {
    throw new Error('Database query failed');
  }
}
`

## 第二章：情報藍圖 - Interface 與 Type
Interface 是我們對數據的「承諾」。它確保了不同模組之間傳遞的數據格式一致。