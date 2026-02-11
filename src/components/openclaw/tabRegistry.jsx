import { renderAllTab } from "./tabs/allTab";
import { renderAutoTab } from "./tabs/autoTab";
import { renderReviewTab } from "./tabs/reviewTab";
import { renderTasksTab } from "./tabs/tasksTab";
import { renderN8nTab } from "./tabs/n8nTab";
import { renderApiTab } from "./tabs/apiTab";
import { renderSecurityTab } from "./tabs/securityTab";
import { renderPluginsTab } from "./tabs/pluginsTab";
import { renderEvoTab } from "./tabs/evoTab";

export const TAB_ITEMS = [
  { key: "all", label: "總覽" },
  { key: "auto", label: "⚡ 自動化" },
  { key: "review", label: "🔍 審核" },
  { key: "tasks", label: "📊 任務" },
  { key: "n8n", label: "🔗 n8n" },
  { key: "api", label: "🔌 API" },
  { key: "security", label: "🛡️ 安全" },
  { key: "plugins", label: "🧩 Plugin" },
  { key: "evo", label: "🧬 進化" },
];

export function renderTabContent(tab, data, actions) {
  const tabRenderers = {
    all: renderAllTab,
    auto: renderAutoTab,
    review: renderReviewTab,
    tasks: renderTasksTab,
    n8n: renderN8nTab,
    api: renderApiTab,
    security: renderSecurityTab,
    plugins: renderPluginsTab,
    evo: renderEvoTab,
  };

  const render = tabRenderers[tab] || tabRenderers.evo;
  return render(data, actions);
}
