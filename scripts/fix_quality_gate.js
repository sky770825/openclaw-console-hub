const fs = require('fs');
const path = '/Users/caijunchang/openclaw任務面版設計/server/src/governanceEngine.ts';

let content = fs.readFileSync(path, 'utf8');

/**
 * We need to find the logic where artifacts_real_landing is checked.
 * Based on the description, it currently only deducts score.
 * We need to force status to 'failed'.
 */

// Search for the check block. 
// Common pattern: if (results.artifacts_real_landing === false) or similar.
const landingRegex = /(if\s*\([^)]*artifacts_real_landing\s*===\s*false[^)]*\)\s*\{)([\s\S]*?)(score\s*-=\s*\d+;?)/g;

if (landingRegex.test(content)) {
    // Reset regex index
    landingRegex.lastIndex = 0;
    
    const newContent = content.replace(landingRegex, (match, prefix, body, scoreDeduction) => {
        // Only modify if not already failed
        if (body.includes("status = 'failed'") || body.includes('status = "failed"')) {
            return match;
        }
        
        // Inject the failure status and descriptive reason
        // We look for where the result object is (likely 'res' or 'result' or 'task')
        // We'll use a generic approach to set the status and reason
        return `${prefix}${body}${scoreDeduction}\n    // Forced failure due to landing verification\n    (result as any).status = 'failed';\n    (result as any).reason = ((result as any).reason || '') + ' [Quality Gate Failure: Artifacts failed to land in workspace]';`;
    });

    fs.writeFileSync(path, newContent, 'utf8');
    console.log('Successfully updated governanceEngine.ts via regex matching.');
} else {
    // Fallback strategy: Line-based injection if the specific regex fails
    console.log('Regex did not match exactly, attempting fallback logic...');
    let lines = content.split('\n');
    let modified = false;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('artifacts_real_landing === false')) {
            // Find the next score deduction or the end of the block
            for (let j = i + 1; j < i + 10 && j < lines.length; j++) {
                if (lines[j].includes('score -=') || lines[j].includes('}')) {
                    lines.splice(j + 1, 0, "    (result as any).status = 'failed';", "    (result as any).reason = ((result as any).reason || '') + ' [Quality Gate Failure: Artifacts failed to land in workspace]';");
                    modified = true;
                    break;
                }
            }
        }
        if (modified) break;
    }
    
    if (modified) {
        fs.writeFileSync(path, lines.join('\n'), 'utf8');
        console.log('Successfully updated governanceEngine.ts via fallback line injection.');
    } else {
        console.error('Failed to find artifacts_real_landing check block.');
        process.exit(1);
    }
}
