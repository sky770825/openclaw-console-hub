import { SecurityPanel } from "../panels";

export function renderSecurityTab(data) {
  const { boardConfig } = data;
  return <div style={{ maxWidth: 800 }}><SecurityPanel layers={boardConfig.securityLayers} rbacMatrix={boardConfig.rbacMatrix} /></div>;
}
