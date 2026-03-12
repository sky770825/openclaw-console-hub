const fs = require('fs');
const filePath = process.argv[2];

if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
}

let content = fs.readFileSync(filePath, 'utf8');

// Step 1: Initialize a flag to track if artifacts failed to land
// We look for the start of the score calculation to inject our variable
if (!content.includes('let artifactsLandingFailed = false;')) {
    // Inject after totalScore or score initialization
    content = content.replace(/(let\s+(totalScore|score)\s*=\s*\d+;)/, '$1\n    let artifactsLandingFailed = false;');
}

// Step 2: Locate the artifacts_real_landing check and set the flag if it fails
// We look for the specific block handling this check
const landingPattern = /case\s+['"]artifacts_real_landing['"]:\s*if\s*\(!passed\)\s*\{/;
const landingPatternAlt = /if\s*\(check\.id\s*===\s*['"]artifacts_real_landing['"]\s*&&\s*!check\.passed\)\s*\{/;

if (landingPattern.test(content)) {
    content = content.replace(landingPattern, '$& artifactsLandingFailed = true;');
    console.log('Applied flag injection for Pattern A (case)');
} else if (landingPatternAlt.test(content)) {
    content = content.replace(landingPatternAlt, '$& artifactsLandingFailed = true;');
    console.log('Applied flag injection for Pattern B (if check.id)');
} else {
    // Generic fallback: if artifacts_real_landing is mentioned and we see a deduction logic
    const genericPattern = /(['"]artifacts_real_landing['"].*?score\s*-=\s*\d+;?)/s;
    if (genericPattern.test(content)) {
        content = content.replace(genericPattern, '$1\n      artifactsLandingFailed = true;');
        console.log('Applied flag injection for Pattern C (generic)');
    }
}

// Step 3: Override the final status to 'failed' if the flag is true
// This targets the ternary operator determining status
const statusRegex = /(status:\s*)([^,?\n]+>=[^,?\n]+\?\s*['"]success['"]\s*:\s*['"]failed['"])/;
const statusVarRegex = /(status\s*=\s*)([^;?\n]+>=[^;?\n]+\?\s*['"]success['"]\s*:\s*['"]failed['"])/;

if (statusRegex.test(content)) {
    content = content.replace(statusRegex, "$1 artifactsLandingFailed ? 'failed' : ($2)");
    console.log('Applied status override in return object');
} else if (statusVarRegex.test(content)) {
    content = content.replace(statusVarRegex, "$1 artifactsLandingFailed ? 'failed' : ($2)");
    console.log('Applied status override in variable assignment');
}

// Step 4: Update the summary/reasoning if possible
const summaryRegex = /(summary:\s*['"])([^'"]+)(['"])/;
if (summaryRegex.test(content)) {
    content = content.replace(summaryRegex, "$1$2$3 + (artifactsLandingFailed ? ' [品質門失敗：產出物未落地驗證失敗]' : '')");
    console.log('Updated summary with failure reason');
}

fs.writeFileSync(filePath, content);
console.log('Modification complete.');
