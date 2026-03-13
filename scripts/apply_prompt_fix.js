const fs = require('fs');

const targetFile = "/Users/sky770825/openclaw任務面版設計/server/src/telegram/dar-think.ts";
const marker = "## 行動本能";
const newRules = [
    "對話時優先自己做（read_file/run_script/write_file）",
    "create_task 是派工不是做事",
    "一次對話最多建 1 個任務",
    "禁止建寫計畫寫提案類任務"
];

try {
    if (!fs.existsSync(targetFile)) {
        console.error(`Error: File ${targetFile} not found.`);
        process.exit(1);
    }

    let content = fs.readFileSync(targetFile, 'utf8');

    if (!content.includes(marker)) {
        console.error(`Error: Could not find section "${marker}" in the system prompt.`);
        process.exit(1);
    }

    // Check if rules are already applied (idempotency)
    if (content.includes("禁止建寫計畫寫提案類任務")) {
        console.log("Status: The system prompt is already up to date.");
        process.exit(0);
    }

    // Construct the replacement
    const replacement = `${marker}\n- ${newRules.join('\n- ')}`;
    const updatedContent = content.replace(marker, replacement);

    // Attempt to write changes
    fs.writeFileSync(targetFile, updatedContent);
    console.log("Status: Successfully updated system prompt in dar-think.ts");

} catch (err) {
    console.error("Critical error while modifying the file:", err.message);
    process.exit(1);
}
