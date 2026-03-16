import { useState, useCallback, useRef } from "react";
import { C } from "./uiPrimitives";

const VARIANTS = {
  danger:  { ok: C.red,    okBg: C.redG,    okHover: "rgba(248,113,113,0.25)" },
  warning: { ok: C.amber,  okBg: C.amberG,  okHover: "rgba(251,191,36,0.25)" },
  info:    { ok: C.purple, okBg: C.purpleG, okHover: "rgba(192,132,252,0.25)" },
};

function ConfirmDialog({ open, title, desc, okText, cancelText, variant, onOk, onCancel }) {
  const [okHover, setOkHover] = useState(false);
  const [cancelHover, setCancelHover] = useState(false);
  const v = VARIANTS[variant] || VARIANTS.info;

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        animation: "oc-cfm-in .15s ease-out",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        style={{
          background: C.s2,
          border: `1px solid ${C.borderH}`,
          borderRadius: 16,
          padding: "24px 28px 20px",
          maxWidth: 420,
          width: "90%",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 1px rgba(255,255,255,0.1)",
          animation: "oc-cfm-scale .15s ease-out",
        }}
      >
        {/* Title */}
        <div style={{ fontSize: 15, fontWeight: 700, color: C.t1, marginBottom: 8 }}>
          {title || "確認"}
        </div>

        {/* Description */}
        <div style={{ fontSize: 12.5, color: C.t2, lineHeight: 1.6, whiteSpace: "pre-line", marginBottom: 20 }}>
          {desc}
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button
            onClick={onCancel}
            onMouseEnter={() => setCancelHover(true)}
            onMouseLeave={() => setCancelHover(false)}
            style={{
              padding: "8px 18px",
              borderRadius: 10,
              border: `1px solid ${C.border}`,
              background: cancelHover ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.02)",
              color: C.t2,
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all .15s",
              fontFamily: "inherit",
            }}
          >
            {cancelText || "取消"}
          </button>
          <button
            onClick={onOk}
            onMouseEnter={() => setOkHover(true)}
            onMouseLeave={() => setOkHover(false)}
            style={{
              padding: "8px 22px",
              borderRadius: 10,
              border: `1px solid ${v.ok}30`,
              background: okHover ? v.okHover : v.okBg,
              color: v.ok,
              fontSize: 12.5,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all .15s",
              fontFamily: "inherit",
            }}
          >
            {okText || "確認"}
          </button>
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes oc-cfm-in { from { opacity: 0 } to { opacity: 1 } }
        @keyframes oc-cfm-scale { from { opacity: 0; transform: scale(0.95) } to { opacity: 1; transform: scale(1) } }
      `}</style>
    </div>
  );
}

/**
 * Hook: useConfirmDialog
 * Returns { confirm, ConfirmDialogRoot }
 * - confirm({ title, desc, okText, cancelText, variant }) → Promise<boolean>
 * - ConfirmDialogRoot: JSX element to render in component tree
 */
export function useConfirmDialog() {
  const [state, setState] = useState(null); // { title, desc, ... }
  const resolveRef = useRef(null);

  const confirm = useCallback(({ title, desc, okText, cancelText, variant = "info" }) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setState({ title, desc, okText, cancelText, variant });
    });
  }, []);

  const handleOk = useCallback(() => {
    resolveRef.current?.(true);
    setState(null);
  }, []);

  const handleCancel = useCallback(() => {
    resolveRef.current?.(false);
    setState(null);
  }, []);

  const ConfirmDialogRoot = state ? (
    <ConfirmDialog
      open
      title={state.title}
      desc={state.desc}
      okText={state.okText}
      cancelText={state.cancelText}
      variant={state.variant}
      onOk={handleOk}
      onCancel={handleCancel}
    />
  ) : null;

  return { confirm, ConfirmDialogRoot };
}
