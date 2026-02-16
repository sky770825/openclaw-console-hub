import { useState, useEffect, useCallback } from "react";
import { C, Pulse, Badge } from "./uiPrimitives";
import { apiUrl, apiHeaders } from "@/services/openclawBoardApi";

export function DispatchToggle() {
  const [on, setOn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [execCount, setExecCount] = useState(0);

  const poll = useCallback(async () => {
    try {
      const r = await fetch(apiUrl("/api/openclaw/dispatch/status"), {
        headers: apiHeaders(false),
      });
      if (!r.ok) return;
      const data = await r.json();
      if (data.ok) {
        setOn(data.dispatchMode);
        setPendingCount(data.pendingReviewCount || 0);
        setExecCount(data.recentExecutionCount || 0);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    poll();
    const id = setInterval(poll, 15000);
    return () => clearInterval(id);
  }, [poll]);

  const toggle = async () => {
    setLoading(true);
    try {
      const r = await fetch(apiUrl("/api/openclaw/dispatch/toggle"), {
        method: "POST",
        headers: apiHeaders(),
        body: JSON.stringify({ enabled: !on }),
      });
      const data = await r.json();
      if (data.ok) {
        setOn(data.dispatchMode);
        if (!data.dispatchMode) {
          setPendingCount(0);
          setExecCount(0);
        }
      }
    } catch (e) {
      console.warn("[Dispatch] toggle failed", e);
    }
    setLoading(false);
  };

  return (
    <button
      data-oc-action="BTN_DISPATCH_TOGGLE"
      onClick={toggle}
      disabled={loading}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 12px",
        borderRadius: 8,
        border: `1px solid ${on ? C.purple + "40" : C.border}`,
        background: on ? C.purpleG : "transparent",
        color: on ? C.purple : C.t3,
        fontSize: 10,
        fontWeight: 600,
        cursor: loading ? "wait" : "pointer",
        fontFamily: "inherit",
        transition: "all .2s",
      }}
      title={on ? `自動派工中 — Claude 指揮（已執行 ${execCount} 個）` : "點擊開啟自動派工模式"}
    >
      {on && <Pulse c={C.purple} s={5} />}
      <span>{loading ? "切換中…" : on ? "自動派工" : "派工關閉"}</span>
      {on && pendingCount > 0 && (
        <Badge c="#fff" bg={C.red} style={{ marginLeft: 2, padding: "1px 5px", fontSize: 9 }}>
          {pendingCount}
        </Badge>
      )}
    </button>
  );
}
