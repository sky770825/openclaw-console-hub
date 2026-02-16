import { N8nPanel } from "../panels";

export function renderN8nTab(data) {
  const { boardConfig } = data;
  return <div style={{ maxWidth: 720 }}><N8nPanel flows={boardConfig.n8nFlows} /></div>;
}
