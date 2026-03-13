const fs = require('fs');
const path = process.argv[2];

if (!fs.existsSync(path)) {
    console.error(`File not found: ${path}`);
    process.exit(1);
}

let content = fs.readFileSync(path, 'utf8');
const instruction = '對話時優先自己做（read_file/run_script/write_file），create_task 是派工不是做事，一次對話最多建 1 個任務，禁止建寫計畫寫提案類任務。';

// Check if instruction is already present to maintain idempotency
if (content.includes('一次對話最多建 1 個任務')) {
    console.log('Instruction already exists in the prompt. Skipping modification.');
    process.exit(0);
}

// Target the "行動本能" section
// We look for "行動本能" followed by a colon or newline
const regex = /(行動本能[：:]\s*)/;
if (regex.test(content)) {
    content = content.replace(regex, `$1${instruction}\n`);
    fs.writeFileSync(path, content, 'utf8');
    console.log('Successfully updated the "行動本能" section.');
} else {
    // If section not found, append it to the end or find a logical place
    content += `\n\n行動本能：${instruction}\n`;
    fs.writeFileSync(path, content, 'utf8');
    console.log('Section "行動本能" not found. Appended to the end of file.');
}
