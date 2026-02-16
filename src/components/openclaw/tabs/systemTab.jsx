import { useState } from "react";
import { C, Card, Btn, Badge } from "../uiPrimitives";
import { N8nPanel, ApiPanel, SecurityPanel, PluginPanel, ProtocolPanel } from "../panels";

function CollapseSection({ icon, title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: 16 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex", alignItems: "center", gap: 8, width: "100%",
          padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.border}`,
          background: open ? "rgba(255,255,255,0.03)" : C.s2,
          color: C.t1, fontSize: 13, fontWeight: 600, cursor: "pointer",
          fontFamily: "inherit", transition: "all .15s",
        }}
      >
        <span style={{ fontSize: 14 }}>{icon}</span>
        <span>{title}</span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: C.t3, transition: "transform .15s", transform: open ? "rotate(90deg)" : "none" }}>▶</span>
      </button>
      {open && (
        <div style={{ marginTop: 8, paddingLeft: 4, animation: "oc-su .15s ease" }}>
          {children}
        </div>
      )}
    </div>
  );
}

export function renderSystemTab(data) {
  const { boardConfig } = data;
  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ fontSize: 12, color: C.t3, marginBottom: 16, lineHeight: 1.5 }}>
        系統架構與整合設定。這些面板以參考資料為主，展開可查看細節。
      </div>
      <CollapseSection icon="🔗" title="n8n 工作流" defaultOpen>
        <N8nPanel flows={boardConfig.n8nFlows} />
      </CollapseSection>
      <CollapseSection icon="🔌" title="API 端點">
        <ApiPanel endpoints={boardConfig.apiEndpoints} />
      </CollapseSection>
      <CollapseSection icon="🛡️" title="安全防護 / RBAC">
        <SecurityPanel layers={boardConfig.securityLayers} rbacMatrix={boardConfig.rbacMatrix} />
      </CollapseSection>
      <CollapseSection icon="🧩" title="Plugin 市集">
        <PluginPanel plugins={boardConfig.plugins} />
      </CollapseSection>
      <CollapseSection icon="🧠" title="Agent 協作 Protocol">
        <ProtocolPanel />
      </CollapseSection>
    </div>
  );
}
