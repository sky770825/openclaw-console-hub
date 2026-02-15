import {
  Stats,
  AutoPanel,
  ReviewPanel,
  TaskBoard,
  N8nPanel,
  SecurityPanel,
  PluginPanel,
  EvoPanel,
  ProtocolPanel,
} from "../panels";

export function renderAllTab(data, actions) {
  const { autos, reviews, tasks, boardConfig, evo } = data;
  const { setDrawer, togA, runA, okR, noR, okRAndCreateTask, progT, runT, delT, moveT, addQuiz } = actions;

  return <>
    <Stats tasks={tasks} autos={autos} reviews={reviews} />
    <div className="oc-grid-all" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 20 }}>
      <div style={{ minWidth: 0, overflowX: "hidden", overflowWrap: "break-word" }}>
        <AutoPanel autos={autos} onTog={togA} onRun={runA} onView={setDrawer} />
        <ReviewPanel reviews={reviews} onOk={okR} onNo={noR} onOkAndCreateTask={okRAndCreateTask} onView={setDrawer} />
        <N8nPanel flows={boardConfig.n8nFlows} />
      </div>
      <div style={{ minWidth: 0, overflowX: "hidden", overflowWrap: "break-word" }}>
        <TaskBoard tasks={tasks} onProg={progT} onView={setDrawer} onRun={runT} onDelete={delT} onMove={moveT} onAddQuiz={addQuiz} />
        <SecurityPanel layers={boardConfig.securityLayers} rbacMatrix={boardConfig.rbacMatrix} />
        <PluginPanel plugins={boardConfig.plugins} />
        <ProtocolPanel />
        <EvoPanel log={evo} />
      </div>
    </div>
  </>;
}
