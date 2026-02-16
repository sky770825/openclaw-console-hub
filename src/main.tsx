import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { seedOpenClawIfNeeded } from "./services/seed";

seedOpenClawIfNeeded();

// OpenClaw 深色主題（與 Agent 板一致）
document.documentElement.classList.add('dark');

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
