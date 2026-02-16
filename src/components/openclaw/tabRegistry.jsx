import { renderAllTab } from "./tabs/allTab";
import { renderAutoTab } from "./tabs/autoTab";
import { renderReviewTab } from "./tabs/reviewTab";
import { renderTasksTab } from "./tabs/tasksTab";
import { renderEvoTab } from "./tabs/evoTab";
import { renderSystemTab } from "./tabs/systemTab";
import { renderDispatchTab } from "./tabs/dispatchTab";

export const TAB_ITEMS = [
  { key: "all", label: "總覽" },
  { key: "dispatch", label: "🟣 派工審核" },
  { key: "auto", label: "⚡ 自動化" },
  { key: "review", label: "🔍 審核" },
  { key: "tasks", label: "📊 任務" },
  { key: "evo", label: "🧬 進化" },
  { key: "system", label: "⚙️ 系統" },
];

export function renderTabContent(tab, data, actions) {
  const tabRenderers = {
    all: renderAllTab,
    dispatch: renderDispatchTab,
    auto: renderAutoTab,
    review: renderReviewTab,
    tasks: renderTasksTab,
    evo: renderEvoTab,
    system: renderSystemTab,
  };

  const render = tabRenderers[tab] || tabRenderers.all;
  return render(data, actions);
}
