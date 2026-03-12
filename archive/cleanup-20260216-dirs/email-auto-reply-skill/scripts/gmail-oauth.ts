/**
 * 一次性執行：在瀏覽器完成 Gmail OAuth，並將 token 存成 gmail-token.json
 * 使用方式：npx ts-node scripts/gmail-oauth.ts
 * 請先在 config.json 填好 gmail.clientId、gmail.clientSecret；redirectUri 建議為 http://localhost:3333
 */
import { google } from "googleapis";
import * as fs from "fs";
import * as path from "path";
import * as http from "http";

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.modify",
];

const PORT = 3333;

async function main() {
  const configPath = path.join(process.cwd(), "config.json");
  if (!fs.existsSync(configPath)) {
    console.error("請先建立 config.json（可複製 config.sample.json）並填寫 gmail.clientId、clientSecret");
    process.exit(1);
  }
  const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  const { clientId, clientSecret } = config.gmail || {};
  if (!clientId || !clientSecret) {
    console.error("config.json 內 gmail 需有 clientId、clientSecret");
    process.exit(1);
  }
  const redirect = `http://localhost:${PORT}`;
  const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirect);

  const authUrl = oauth2.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
  });

  const tokenPath = path.resolve(process.cwd(), config.gmail?.tokenPath || "gmail-token.json");

  await new Promise<void>((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url!, redirect);
      const code = url.searchParams.get("code");
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      if (code) {
        try {
          const { tokens } = await oauth2.getToken(code);
          oauth2.setCredentials(tokens);
          fs.writeFileSync(tokenPath, JSON.stringify(tokens, null, 2), "utf-8");
          res.end("<p>授權成功，token 已寫入 " + tokenPath + "。可關閉此頁並回到終端。</p>");
        } catch (e) {
          res.end("<p>取得 token 失敗: " + (e as Error).message + "</p>");
        }
        server.close();
        resolve();
      } else {
        res.end("<p>未收到 code，請重試。</p>");
      }
    });
    server.listen(PORT, () => {
      console.log("請在瀏覽器開啟以下網址完成授權：");
      console.log(authUrl);
    });
    server.on("error", reject);
  });

  console.log("Token 已儲存至", tokenPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
