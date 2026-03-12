#!/bin/bash
SOURCE_FILE="/Users/caijunchang/openclaw任務面版設計/server/src/routes/auto-executor.ts"
REPORT="/Users/caijunchang/.openclaw/workspace/reports/investigation_report_t17723484249.md"

echo "# Investigation Report: P0 Auto-Executor Dispatch Failures" > "$REPORT"
echo "## Task ID: t17723484249" >> "$REPORT"
echo "Date: $(date)" >> "$REPORT"
echo "" >> "$REPORT"

if [ ! -f "$SOURCE_FILE" ]; then
    echo "Error: Source file $SOURCE_FILE not found." >> "$REPORT"
    exit 1
fi

echo "## 1. Analysis of Failure Reason Storage" >> "$REPORT"
echo "Searching for 'recentExecutions' and error handling logic..." >> "$REPORT"
echo '```typescript' >> "$REPORT"
grep -nC 5 "recentExecutions.push" "$SOURCE_FILE" >> "$REPORT" || echo "recentExecutions.push not found" >> "$REPORT"
echo '```' >> "$REPORT"

echo "### Findings on Field Names:" >> "$REPORT"
# Look for where status is set to failed
grep -n "status: 'failed'" "$SOURCE_FILE" -B 3 -A 3 >> "$REPORT" || echo "No explicit 'failed' status assignment found." >> "$REPORT"

echo "## 2. Log Storage and Querying" >> "$REPORT"
echo "Searching for logging patterns (console.log, logger, etc.)..." >> "$REPORT"
echo '```typescript' >> "$REPORT"
grep -E "console\.(log|error)|logger\." "$SOURCE_FILE" | head -n 20 >> "$REPORT"
echo '```' >> "$REPORT"

echo "## 3. Dispatch API Error Handling Logic" >> "$REPORT"
echo "Searching for sendDispatchDigest and dispatch logic..." >> "$REPORT"
echo '```typescript' >> "$REPORT"
grep -nC 10 "sendDispatchDigest" "$SOURCE_FILE" >> "$REPORT" || echo "sendDispatchDigest not found in this file" >> "$REPORT"
echo '```' >> "$REPORT"

echo "## 4. Database Interaction (openclaw_runs)" >> "$REPORT"
echo "Searching for database insertions into openclaw_runs..." >> "$REPORT"
echo '```typescript' >> "$REPORT"
grep -i "openclaw_runs" "$SOURCE_FILE" -A 5 -B 5 >> "$REPORT" || echo "openclaw_runs not mentioned in this file. Checking project for references..." >> "$REPORT"
echo '```' >> "$REPORT"

# Search wider project if not in file
if ! grep -q "openclaw_runs" "$SOURCE_FILE"; then
    echo "Searching entire server directory for openclaw_runs schema..." >> "$REPORT"
    grep -r "openclaw_runs" "/Users/caijunchang/openclaw任務面版設計/server/src" | head -n 10 >> "$REPORT"
fi

echo "## 5. Recommendations for Improvement" >> "$REPORT"
cat >> "$REPORT" << 'RECOM'
1. **Ensure Error Propagation**: If `recentExecutions` only stores success/fail counts, modify the push logic to include `error: err.message` or `stack: err.stack`.
2. **Centralized Logging**: Integrate a logging library (like `winston` or `pino`) that writes to a searchable file or external log aggregator.
3. **Database Column**: If `openclaw_runs` lacks an `error_message` column (TEXT type), add it and update the executor to save `try-catch` exceptions there.
4. **Dispatch Digest Detail**: Enhance `sendDispatchDigest()` to include the last N error messages in the Telegram alert instead of just the count.
RECOM

