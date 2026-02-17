import { IdeaComposer } from "../IdeaComposer";
import { MultiReview } from "../MultiReview";

export function renderReviewTab(data, actions) {
  const { reviews } = data;
  const { setDrawer, okR, noR, okRAndCreateTask, archiveR, submitIdea } = actions;
  return (
    <div style={{ maxWidth: 720 }}>
      <IdeaComposer onSubmit={submitIdea} />
      <MultiReview
        reviews={reviews}
        onOk={okR}
        onNo={noR}
        onOkAndCreateTask={okRAndCreateTask}
        onArchive={archiveR}
        onView={setDrawer}
      />
    </div>
  );
}
