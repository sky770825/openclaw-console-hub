import { Stats, TaskBoard } from "../panels";

export function renderTasksTab(data, actions) {
  const { autos, reviews, tasks } = data;
  const { setDrawer, progT, runT, delT, moveT, addQuiz } = actions;

  return <>
    <Stats tasks={tasks} autos={autos} reviews={reviews} />
    <TaskBoard tasks={tasks} onProg={progT} onView={setDrawer} onRun={runT} onDelete={delT} onMove={moveT} onAddQuiz={addQuiz} />
  </>;
}
