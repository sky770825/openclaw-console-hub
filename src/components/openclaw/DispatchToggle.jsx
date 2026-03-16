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

  const onColor = "#4caf50";
  const offColor = "#ef5350";

  return (
    <button
      data-oc-action="BTN_DISPATCH_TOGGLE"
      onClick={toggle}
      disabled={loading}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 7,
        padding: "5px 14px",
        borderRadius: 20,
        border: `1.5px solid ${on ? onColor + "60" : offColor + "40"}`,
        background: on
          ? `linear-gradient(135deg, rgba(76,175,80,0.15), rgba(76,175,80,0.06))`
          : `linear-gradient(135deg, rgba(239,83,80,0.1), rgba(239,83,80,0.03))`,
        color: on ? onColor : offColor,
        fontSize: 11,
        fontWeight: 700,
        cursor: loading ? "wait" : "pointer",
        fontFamily: "inherit",
        transition: "all .3s ease",
        boxShadow: on
          ? `0 0 12px rgba(76,175,80,0.25), inset 0 0 8px rgba(76,175,80,0.08)`
          : `0 0 8px rgba(239,83,80,0.12)`,
      }}
      title={on ? `自動派工中 — Claude 指揮（已執行 ${execCount} 個）` : "點擊開啟自動派工模式"}
    >
      {/* Status indicator dot */}
      {on ? (
        <Pulse c={onColor} s={6} />
      ) : (
        <span style={{
          display: "inline-block",
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: offColor,
          flexShrink: 0,
          opacity: 0.7,
        }} />
      )}
      <span>{loading ? "切換中…" : on ? "派工中" : "已關閉"}</span>
      {on && pendingCount > 0 && (
        <Badge c="#fff" bg={C.red} style={{ marginLeft: 2, padding: "1px 5px", fontSize: 9 }}>
          {pendingCount}
        </Badge>
      )}
    </button>
  );
}
