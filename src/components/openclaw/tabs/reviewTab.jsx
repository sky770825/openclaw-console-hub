import { ReviewPanel } from "../panels";

export function renderReviewTab(data, actions) {
  const { reviews } = data;
  const { setDrawer, okR, noR } = actions;
  return <div style={{ maxWidth: 680 }}><ReviewPanel reviews={reviews} onOk={okR} onNo={noR} onView={setDrawer} /></div>;
}
