import { useState } from "react";
import { restartGateway } from "@/services/openclawBoardApi";
import { C } from "./uiPrimitives";

export function ResetGatewayBtn() {
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState(false);
  const [msg, setMsg] = useState("");

  const restart = async () => {
    setLoading(true);
    setOk(false);
    setMsg("");
    try {
      const { ok: passed, status, data: j } = await restartGateway();
      if (!passed) {
        setMsg(status === 401 || status === 403 ? "需要 admin key" : "重啟失敗");
        setLoading(false);
        return;
      }
      setOk(j.ok === true);
      if (!j.ok) console.warn("[OpenClaw] restart gateway failed", j);
      if (j.ok) setTimeout(() => setOk(false), 2500);
    } catch (e) {
      console.warn("[OpenClaw] restart gateway failed", e);
      setMsg("重啟失敗");
    }
    setLoading(false);
  };

  return <button data-oc-action="BTN_RESET_GATEWAY" onClick={restart} disabled={loading} style={{ padding: "4px 10px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: msg ? C.red : C.t2, fontSize: 10, fontWeight: 600, cursor: loading ? "wait" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }} title="點擊後自動於背景重啟 OpenClaw Gateway">{loading ? "重啟中…" : msg ? msg : ok ? "✓ 已重啟" : "↻ Reset Gateway"}</button>;
}
