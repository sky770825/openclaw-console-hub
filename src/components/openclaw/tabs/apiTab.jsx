import { ApiPanel } from "../panels";

export function renderApiTab(data) {
  const { boardConfig } = data;
  return <div style={{ maxWidth: 800 }}><ApiPanel endpoints={boardConfig.apiEndpoints} /></div>;
}
