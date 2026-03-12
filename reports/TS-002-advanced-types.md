# TS-002 進階型別與泛型 (Advanced Types)

## 1. 泛型 (Generics)
泛型允許我們在定義函式、介面或類別時，不預先指定具體的型別，而是在使用時再行指定。這大大提升了程式碼的重用性。

typescript
function identity<T>(arg: T): T {
  return arg;
}
## 2. 工具型別 (Utility Types)
TypeScript 提供了許多內建的工具型別來轉換型別：
- `Partial<T>`: 將型別 `T` 的所有屬性設為選填。
- `Pick<T, K>`: 從型別 `T` 中挑選一組屬性 `K`。
- `Omit<T, K>`: 從型別 `T` 中移除一組屬性 `K`。

## 3. 聯合與交叉型別 (Union & Intersection Types)
- **聯合型別 (Union)**: `string | number` 表示可以是字串或數字。
- **交叉型別 (Intersection)**: `TypeA & TypeB` 表示同時擁有兩者的屬性。

## 4. 實戰範例

### A. 通用 API 回應型別
確保所有後端 API 的回傳格式一致且具備型別安全。

### B. 狀態管理型別
定義 Reducer 或 Store 的 Action 與 State，利用泛型處理不同的 Payload。

### C. 設定檔合併工具
使用交叉型別處理預設設定與使用者自定義設定的合併。
