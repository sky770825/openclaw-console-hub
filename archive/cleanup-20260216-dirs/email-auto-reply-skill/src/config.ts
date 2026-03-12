import * as fs from "fs";
import * as path from "path";
import type { Config } from "./types.js";

const DEFAULT_CONFIG_PATH = path.join(process.cwd(), "config.json");

export function loadConfig(configPath: string = DEFAULT_CONFIG_PATH): Config {
  const resolved = path.resolve(configPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`設定檔不存在: ${resolved}，請複製 config.sample.json 為 config.json 並填寫。`);
  }
  const raw = fs.readFileSync(resolved, "utf-8");
  const config = JSON.parse(raw) as Config;
  if (!config.provider || !config.ollama?.baseUrl) {
    throw new Error("config.json 必須包含 provider 與 ollama.baseUrl");
  }
  return config;
}
