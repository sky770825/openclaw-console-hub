const fs = require('fs');
const filePath = process.argv[2];

if (!fs.existsSync(filePath)) {
    console.error("File not found");
    process.exit(1);
}

let content = fs.readFileSync(filePath, 'utf8');

/**
 * Problem Logic: 
 * 'quality': {'grade':'B','score':85,'passed':true,'reason':'未通過: artifacts_real_landing (85分)'}
 * 
 * Goal: Ensure 'passed' is false if 'artifacts_real_landing' appears in the reason.
 */

// Approach: Target the quality object construction or the passed variable assignment.
// We look for "passed: <expression>" followed by "reason: <expression>".
const qualityObjectRegex = /passed\s*:\s*([^,}\n]+)(\s*,\s*reason\s*:)/g;

if (qualityObjectRegex.test(content)) {
    // Replace the passed logic to include a check against the reason variable
    content = content.replace(qualityObjectRegex, (match, passedExpr, reasonPart) => {
        const trimmedExpr = passedExpr.trim();
        // Inject the landing check. We assume 'reason' is accessible in the same scope/object.
        return `passed: (${trimmedExpr}) && !(reason && reason.includes('artifacts_real_landing'))${reasonPart}`;
    });
    console.log("Successfully patched quality object logic.");
} else {
    // Fallback: If it's a direct assignment like "passed = score >= 80"
    const assignmentRegex = /passed\s*=\s*([^;]+);/g;
    if (assignmentRegex.test(content)) {
        content = content.replace(assignmentRegex, (match, expr) => {
            return `passed = (${expr.trim()}) && !(reason && reason.includes('artifacts_real_landing'));`;
        });
        console.log("Successfully patched variable assignment logic.");
    }
}

// Additional safeguard: If there is specific landing check logic, force passed to false there.
if (content.includes('artifacts_real_landing')) {
    const landingFailureBlock = /if\s*\(!artifacts_real_landing\)\s*\{([\s\S]*?)\}/g;
    if (landingFailureBlock.test(content)) {
        content = content.replace(landingFailureBlock, (match, body) => {
            if (!body.includes('passed = false')) {
                return `if (!artifacts_real_landing) {${body}\n    passed = false;\n  }`;
            }
            return match;
        });
    }
}

fs.writeFileSync(filePath, content);
