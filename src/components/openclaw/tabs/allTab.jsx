import {
  Stats,
  AutoPanel,
  ReviewPanel,
  TaskBoard,
  EvoPanel,
} from "../panels";

export function renderAllTab(data, actions) {
  const { autos, reviews, tasks, evo } = data;
  const { setDrawer, togA, runA, okR, noR, okRAndCreateTask, progT, runT, delT, moveT, addQuiz } = actions;

  return <>
    <Stats tasks={tasks} autos={autos} reviews={reviews} />

    {/* 任務看板：全寬，最重要的區塊放最上面 */}
    <TaskBoard tasks={tasks} onProg={progT} onView={setDrawer} onRun={runT} onDelete={delT} onMove={moveT} onAddQuiz={addQuiz} />

    {/* 自動化 + 審核：雙欄 */}
    <div className="oc-grid-all" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 20 }}>
      <div style={{ minWidth: 0, overflowX: "hidden", overflowWrap: "break-word" }}>
        <AutoPanel autos={autos} onTog={togA} onRun={runA} onView={setDrawer} />
      </div>
      <div style={{ minWidth: 0, overflowX: "hidden", overflowWrap: "break-word" }}>
        <ReviewPanel reviews={reviews} onOk={okR} onNo={noR} onOkAndCreateTask={okRAndCreateTask} onView={setDrawer} />
      </div>
    </div>

    {/* 進化紀錄 */}
    <div style={{ maxWidth: 720 }}>
      <EvoPanel log={evo} />
    </div>
  </>;
}
