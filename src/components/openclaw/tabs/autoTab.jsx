import { AutoPanel } from "../panels";

export function renderAutoTab(data, actions) {
  const { autos } = data;
  const { setDrawer, togA, runA } = actions;
  return <div style={{ maxWidth: 800 }}><AutoPanel autos={autos} onTog={togA} onRun={runA} onView={setDrawer} /></div>;
}
