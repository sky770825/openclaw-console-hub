import { ReviewPanel } from "../panels";

export function renderReviewTab(data, actions) {
  const { reviews } = data;
  const { setDrawer, okR, noR, okRAndCreateTask } = actions;
  return (
    <div style={{ maxWidth: 680 }}>
      <ReviewPanel
        reviews={reviews}
        onOk={okR}
        onNo={noR}
        onOkAndCreateTask={okRAndCreateTask}
        onView={setDrawer}
      />
    </div>
  );
}
