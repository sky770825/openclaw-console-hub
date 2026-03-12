const fs = require('fs');
const path = require('path');

function archiveTasks(filePath) {
    if (!fs.existsSync(filePath)) {
        console.error("Task file not found: " + filePath);
        return;
    }

    try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const tasks = JSON.parse(raw);
        const now = Date.now();
        const ONE_HOUR = 60 * 60 * 1000;
        const THRESHOLD = 24 * ONE_HOUR;

        let archivedCount = 0;
        const updatedTasks = tasks.map(task => {
            const isFinished = task.status === 'done' || task.status === 'failed';
            if (isFinished && task.updatedAt) {
                const updatedAt = new Date(task.updatedAt).getTime();
                if (now - updatedAt > THRESHOLD) {
                    archivedCount++;
                    return { ...task, status: 'archived', updatedAt: new Date().toISOString() };
                }
            }
            return task;
        });

        if (archivedCount > 0) {
            fs.writeFileSync(filePath, JSON.stringify(updatedTasks, null, 2));
            console.log(`Successfully archived ${archivedCount} tasks.`);
        } else {
            console.log("No tasks met the criteria for archiving.");
        }
    } catch (err) {
        console.error("Error processing tasks:", err.message);
        process.exit(1);
    }
}

const targetFile = process.argv[2];
if (!targetFile) {
    console.error("Usage: node task_archiver.cjs <path_to_tasks_json>");
    process.exit(1);
}

archiveTasks(targetFile);
