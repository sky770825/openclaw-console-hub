# 30 — 在 Express 中使用 TypeScript 實現依賴注入 (DI)

> 由 達爾 的 AI 顧問團 (claude) 於 2026-03-02 生成。當外部網路工具失效時的內部解決方案。

---

### 教學目錄
1.  為什麼在 Express 中需要 DI？
2.  手動實現 DI (無框架)
3.  使用 DI 容器：tsyringe 範例
4.  比較：手動實現 vs. 使用容器
5.  總結

---

### 1. 為什麼在 Express 中需要 DI？

在一個典型的 Express 應用中，我們通常會將邏輯分層，例如：Routes -> Controllers -> Services -> Repositories/Models。

沒有 DI 的情況 (緊密耦合 - Tight Coupling):

``typescript
// user.service.ts
export class UserService {
  getUserById(id: number) {
    // 假設這裡有資料庫邏輯
    return { id, name: 'John Doe' };
  }
}

// user.controller.ts
import { Request, Response } from 'express';
import { UserService } from '../services/user.service';

export class UserController {
  private userService: UserService;

  constructor() {
    // 問題點：Controller 自己負責建立 UserService 的實例
    // 這就是「緊密耦合」
    this.userService = new UserService(); 
  }

  public getUser(req: Request, res: Response) {
    const user = this.userService.getUserById(Number(req.params.id));
    res.json(user);
  }
}
`

這種寫法有幾個嚴重的問題：

   難以測試 (Hard to Test): 當我們要對 UserController 進行單元測試時，我們無法輕易地「模擬」(mock) UserService。測試會依賴於 UserService 的真實實現，如果 UserService 連接了資料庫，我們的單元測試就會變成緩慢且不穩定的整合測試。
   靈活性差 (Inflexible): 如果 UserService 的建構子未來需要傳入一個 DatabaseConnection 或 Logger 實例，那麼所有建立 UserService 的地方（例如 UserController）都必須跟著修改。這違反了「開放封閉原則」。
   違反單一職責原則 (Violates SRP): UserController 的職責是處理 HTTP 請求和回應，它不應該關心 UserService 是如何被建立的。

DI 的目標就是解決這些問題。 DI 的核心思想是「控制反轉」(Inversion of Control, IoC)，也就是說，一個類別不應該自己建立它所依賴的物件，而應該由外部的某個東西（可能是手動編寫的程式碼，或是一個 DI 容器）將依賴「注入」進來。

使用 DI 後，我們期望的程式碼看起來像這樣：

`typescript
// user.controller.ts
export class UserController {
  // 依賴是從外部傳入的，而不是在內部建立
  constructor(private userService: UserService) {} 

  // ... 方法不變
}
`

這樣一來，UserController 就與 UserService 的具體建立過程解耦了。在測試時，我們可以輕易地傳入一個模擬的 UserService 物件。

---

### 2. 手動實現 DI (無框架)

在沒有任何 DI 容器的情況下，我們可以在應用的「入口點」(entry point) 或一個專門的組合根 (Composition Root) 來手動建立和組裝我們的依賴關係。

步驟 1: 修改 Service 和 Controller

`typescript
// src/services/user.service.ts
// (維持原樣或增加依賴)
export class UserService {
  // 如果 Service 也有依賴，也透過 constructor 注入
  // constructor(private db: Database) {}

  getUserById(id: number) {
    return { id, name: 'John Doe' };
  }
}

// src/controllers/user.controller.ts
import { Request, Response } from 'express';
import { UserService } from '../services/user.service';

export class UserController {
  // 依賴從 constructor 注入
  constructor(private userService: UserService) {}

  public getUser = (req: Request, res: Response) => {
    const user = this.userService.getUserById(Number(req.params.id));
    res.json(user);
  }
}
`

步驟 2: 在應用的入口點組裝依賴

這通常在你的 app.ts 或 server.ts 中完成。

`typescript
// src/app.ts
import express from 'express';
import { UserController } from './controllers/user.controller';
import { UserService } from './services/user.service';

const app = express();

// === Composition Root 開始 ===
// 1. 建立最底層的依賴 (如果有的話，例如資料庫連線)
// const dbConnection = new DatabaseConnection();

// 2. 建立服務層，並注入它們的依賴
const userService = new UserService(/ dbConnection /);

// 3. 建立控制器層，並注入服務
const userController = new UserController(userService);
// === Composition Root 結束 ===


// === 路由設定 ===
// 注意這裡我們傳遞的是 userController 的實例方法
app.get('/users/:id', userController.getUser);


app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
`

這樣，我們就在應用啟動時，將所有物件的依賴關係「連接」好了。整個依賴圖 (dependency graph) 是在一個地方管理的，非常清晰。

---

### 3. 使用 DI 容器：tsyringe 範例

手動管理在小型專案中是可行的，但當依賴關係變得複雜時，手動組裝會變得很繁瑣。這時 DI 容器就派上用場了。tsyringe 是由 Microsoft 開發的一個輕量級 DI 容器。

步驟 1: 安裝 tsyringe 和相關設定

`bash
npm install tsyringe reflect-metadata
`

在你的 tsconfig.json 中啟用 decorator 和 metadata:


{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    // ... other options
  }
}
`

在你的應用入口檔案 (app.ts 或 server.ts) 的最頂部，導入 reflect-metadata：

`typescript
import 'reflect-metadata';
// ... 其它 imports
`

步驟 2: 使用 Decorators 標記你的類別

tsyringe 使用 decorators 來識別哪些類別是可以被注入的，以及它們的依賴是什麼。

`typescript
// src/services/user.service.ts
import { injectable } from 'tsyringe';

@injectable() // 標記這個類別可以被容器建立和注入
export class UserService {
  getUserById(id: number) {
    return { id, name: 'John Doe' };
  }
}

// src/controllers/user.controller.ts
import { Request, Response } from 'express';
import { autoInjectable } from 'tsyringe'; // or @injectable
import { UserService } from '../services/user.service';

@autoInjectable() // 讓容器自動解析 constructor 的依賴
export class UserController {
  constructor(private userService?: UserService) {}

  public getUser = (req: Request, res: Response) => {
    // 使用 ? 是因為 autoInjectable 會在運行時注入
    const user = this.userService!.getUserById(Number(req.params.id));
    res.json(user);
  }
}
`

步驟 3: 在路由中解析 Controller

我們不再手動 new UserController()，而是請求容器幫我們建立一個實例。

`typescript
// src/app.ts
import 'reflect-metadata';
import express from 'express';
import { container } from 'tsyringe';
import { UserController } from './controllers/user.controller';

const app = express();

// 從容器中「解析」出 UserController 的一個實例
// 容器會自動處理 UserController 的所有依賴 (例如 UserService)
const userController = container.resolve(UserController);

app.get('/users/:id', (req, res) => userController.getUser(req, res));

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
`

容器會查看 UserController 的建構子，發現它需要一個 UserService，然後容器會自動去建立一個 UserService 的實例，並將它傳入 UserController 的建構子。如果 UserService 還有其它依賴，容器會遞歸地解決所有依賴關係。

---

### 4. 比較：手動實現 vs. 使用容器

| 特性 | 手動實現 DI | 使用 DI 容器 (如 tsyringe) |
| :--- | :--- | :--- |
| 學習曲線 | 低。只需要理解 constructor injection 的概念。 | 中等。需要學習容器的 API、decorators 和生命週期管理。 |
| 設定複雜度 | 簡單。不需要額外的庫或 tsconfig.json 設定。 | 較複雜。需要安裝庫、設定 tsconfig.json、導入 reflect-metadata。 |
| 代碼侵入性 | 低。純 TypeScript/JavaScript，沒有 decorators。 | 較高。需要在程式碼中加入 @injectable 等 decorators。 |
| 可維護性 | 在小型專案中良好。在大型專案中，組合根會變得非常龐大和複雜。 | 在大型專案中優秀。依賴關係由容器自動管理，開發者無需關心物件的建立順序。 |
| 功能 | 基礎。只有依賴注入。 | 強大。提供生命週期管理（單例、瞬態）、作用域、攔截器、工廠模式等高級功能。 |
| 適用場景 | 小型到中型專案，或對第三方庫有嚴格限制的環境。 | 中型到大型專案，特別是依賴關係複雜、需要長期維護的應用。 |

---

### 5. 總結

對於任何有志於長期發展的 Express 專案，採用 DI 都是一個明智的選擇。

   新手或小型專案：可以從手動實現 DI 開始，這能讓你深刻理解 DI 的核心價值，而不會引入過多的複雜性。
*   中大型或企業級專案：強烈建議使用像 tsyringe 或 InversifyJS` 這樣的 DI 容器。它們能自動化管理複雜的依賴關係，並提供強大的生命週期管理功能，讓你的架構保持清晰和可擴展。

最終，無論選擇哪種方式，核心目標都是一樣的：實現控制反轉，解耦你的元件，從而寫出更乾淨、更健壯、更易於測試的程式碼。