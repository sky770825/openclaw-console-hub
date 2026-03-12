const fs = require('fs');

function solve() {
    const inputPath = process.argv[2];
    const outputPath = process.argv[3];
    const original = fs.readFileSync(inputPath, 'utf8');
    
    // Heuristic: Identify the variable used for task ID in upsertOpenClawTask calls
    const taskIdMatch = original.match(/upsertOpenClawTask\(\{\s*id:\s*([^,}\s]+)/);
    const taskIdVar = taskIdMatch ? taskIdMatch[1] : 'task.id';

    const lines = original.split('\n');
    const resultLines = [];
    let fixCount = 0;

    for (let i = 0; i < lines.length; i++) {
        resultLines.push(lines[i]);
        
        // Pattern: Detect scoring failure branches like: if (score < ...)
        if (lines[i].includes('if') && lines[i].includes('score') && (lines[i].includes('<') || lines[i].includes('!'))) {
            // Look ahead for a 'return' statement that isn't preceded by a status update
            for (let j = 1; j <= 8; j++) {
                if (i + j >= lines.length) break;
                
                const currentLine = lines[i + j];
                
                // If we hit a return and haven't seen an update yet
                if (currentLine.includes('return')) {
                    // Check if update call already exists in this block
                    let blockHasUpdate = false;
                    for (let k = 0; k <= j; k++) {
                        if (lines[i + k].includes('upsertOpenClawTask')) {
                            blockHasUpdate = true;
                            break;
                        }
                    }

                    if (!blockHasUpdate) {
                        const indent = currentLine.match(/^\s*/)[0];
                        const fixLine = `${indent}await upsertOpenClawTask({ id: ${taskIdVar}, status: 'failed', progress: 100, result: \`Grading failed: score \${score} below threshold\` });`;
                        
                        // Insert the fix before the return
                        resultLines.splice(resultLines.length - 1, 0, fixLine);
                        fixCount++;
                    }
                    break; 
                }
                
                // Stop if we exit the block
                if (currentLine.includes('}')) break;
            }
        }
    }

    fs.writeFileSync(outputPath, resultLines.join('\n'));
    return fixCount;
}

const count = solve();
console.log(`FIXED_BRANCHES:${count}`);
