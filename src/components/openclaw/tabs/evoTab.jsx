import { EvoPanel } from "../panels";

export function renderEvoTab(data) {
  const { evo } = data;
  return <div style={{ maxWidth: 680 }}><EvoPanel log={evo} /></div>;
}
