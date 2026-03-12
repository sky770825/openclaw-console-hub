/**
 * Governance Engine - Fixed State Transition Logic
 * This module correctly maps quality grades to task statuses.
 */

function evaluateTaskStatus(currentTask, qualityGrade) {
    console.log(`Evaluating task: ${currentTask.id}`);
    console.log(`Quality Grade received: ${qualityGrade}`);

    let newStatus = currentTask.status;

    switch (qualityGrade) {
        case 'A':
        case 'B':
        case 'C':
            newStatus = 'completed';
            break;
        case 'F':
            newStatus = 'failed';
            console.log(`[FIX] Grade F detected. Setting status to 'failed' for task ${currentTask.id}`);
            break;
        default:
            console.warn(`Unrecognized quality grade: ${qualityGrade}. Status remains ${newStatus}.`);
    }

    return {
        ...currentTask,
        quality: qualityGrade,
        status: newStatus,
        updatedAt: new Date().toISOString()
    };
}

// Verification Tests
const testTasks = [
    { id: 'task_001', status: 'processing' },
    { id: 'task_002', status: 'processing' }
];

console.log("--- Running Logic Verification ---");

// Test Case 1: Quality F should result in failed status
const resultF = evaluateTaskStatus(testTasks[0], 'F');
if (resultF.status === 'failed') {
    console.log("Test Case F: PASSED");
} else {
    console.error("Test Case F: FAILED - Expected status 'failed' but got '" + resultF.status + "'");
    process.exit(1);
}

// Test Case 2: Quality A should result in completed status
const resultA = evaluateTaskStatus(testTasks[1], 'A');
if (resultA.status === 'completed') {
    console.log("Test Case A: PASSED");
} else {
    console.error("Test Case A: FAILED - Expected status 'completed'");
    process.exit(1);
}

console.log("--- All tests passed ---");
console.log("Final State (Grade F):", JSON.stringify(resultF, null, 2));
