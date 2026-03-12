# Quality Improvement: ScriptGen Prompt Landing

## Problem
AI generated scripts often default to writing outputs to `sandbox/output`, which fails to satisfy tasks requiring modification of project source or landing files in specific workspace directories.

## Solution Applied
Modified `server/src/executor-agents.ts` within the `callGeminiForScript` function (around line 1002) to include a strict requirement:
> "產出必須寫到任務描述指定的真實路徑，sandbox/output 不算完成。修改源碼要直接改真實檔案。"

## Expected Impact
Improvement in `artifacts_real_landing` metric as agents will now be explicitly instructed to bypass the sandbox output convention in favor of requested target paths.
