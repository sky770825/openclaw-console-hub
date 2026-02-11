import { PluginPanel } from "../panels";

export function renderPluginsTab(data) {
  const { boardConfig } = data;
  return <div style={{ maxWidth: 720 }}><PluginPanel plugins={boardConfig.plugins} /></div>;
}
