/**
 * Test Bench for Quality Gate Logic
 */
function calculateScore(result: { error: boolean, output: string, code: number }): number {
    let score = 100;
    
    // Improved Logic (Simulating what we patched)
    const isError = result.code !== 0;
    const isComplete = result.output.toUpperCase().includes('TASK_COMPLETE');

    if (isError) {
        score -= 50;
    } else if (!isComplete) {
        score -= 35;
    }

    return score;
}

// Scenario 1: Runtime Error
const s1 = calculateScore({ error: true, code: 1, output: "Error happened" });
console.log(`Scenario 1 (Error): Expected 50, Got ${s1}`);

// Scenario 2: Success but no tag
const s2 = calculateScore({ error: false, code: 0, output: "Process finished" });
console.log(`Scenario 2 (No Tag): Expected 65, Got ${s2}`);

// Scenario 3: Success with tag (lowercase)
const s3 = calculateScore({ error: false, code: 0, output: "task_complete" });
console.log(`Scenario 3 (Lowercase Tag): Expected 100, Got ${s3}`);

if (s1 === 50 && s2 === 65 && s3 === 100) {
    console.log("VERIFICATION_SUCCESS");
} else {
    console.log("VERIFICATION_FAILED");
    process.exit(1);
}
