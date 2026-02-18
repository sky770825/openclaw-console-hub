import {
  Stats,
  AutoPanel,
  ReviewPanel,
  TaskBoard,
  EvoPanel,
} from "../panels";
import { C } from "../uiPrimitives";

export function renderAllTab(data, actions) {
  const { autos, reviews, tasks, evo } = data;
  const { setDrawer, togA, runA, okR, noR, archiveR, okRAndCreateTask, progT, runT, delT, moveT, addQuiz, approveRiskItems, commentR, autoReviewByRisk } = actions;

  return <>
    <Stats tasks={tasks} autos={autos} reviews={reviews} />

    {/* 任務看板：全寬，最重要的區塊放最上面 */}
    <div style={{display:"flex",justifyContent:"flex-end",marginBottom:-6}}>
      <span data-oc-action="GOTO_MULTIBOARD" onClick={()=>document.querySelector('[data-oc-action="TAB_TASKS"]')?.click()} style={{fontSize:10,color:C.indigo,cursor:"pointer",textDecoration:"underline"}}>前往多看板視圖 →</span>
    </div>
    <TaskBoard tasks={tasks} onProg={progT} onView={setDrawer} onRun={runT} onDelete={delT} onMove={moveT} onAddQuiz={addQuiz} />

    {/* 自動化 + 審核：雙欄 */}
    <div className="oc-grid-all" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(340px,100%),1fr))", gap: 20 }}>
      <div style={{ minWidth: 0, overflowX: "hidden", overflowWrap: "break-word" }}>
        <AutoPanel autos={autos} onTog={togA} onRun={runA} onView={setDrawer} />
      </div>
      <div style={{ minWidth: 0, overflowX: "hidden", overflowWrap: "break-word" }}>
        <div style={{display:"flex",justifyContent:"flex-end",marginBottom:-6}}>
          <span data-oc-action="GOTO_MULTIREVIEW" onClick={()=>document.querySelector('[data-oc-action="TAB_REVIEW"]')?.click()} style={{fontSize:10,color:C.indigo,cursor:"pointer",textDecoration:"underline"}}>前往多分類審核 →</span>
        </div>
        <ReviewPanel reviews={reviews} onOk={okR} onNo={noR} onOkAndCreateTask={okRAndCreateTask} onArchive={archiveR} onView={setDrawer} onApproveRiskItems={approveRiskItems} onComment={commentR} onAutoReview={autoReviewByRisk} />
      </div>
    </div>

    {/* 進化紀錄 */}
    <div style={{ maxWidth: 720 }}>
      <EvoPanel log={evo} />
    </div>
  </>;
}
