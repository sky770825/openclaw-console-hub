#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Configuration: Adjust path to your tasks JSON if applicable
const TASKS_PATH = process.env.TASKS_JSON_PATH || path.join(__dirname, '../sandbox/tasks.json');

async function runArchive(dryRun = false) {
    if (!fs.existsSync(TASKS_PATH)) {
        console.log('No tasks file found at ' + TASKS_PATH);
        return;
    }

    const data = JSON.parse(fs.readFileSync(TASKS_PATH, 'utf8'));
    const tasks = Array.isArray(data) ? data : (data.tasks || []);
    const cutoff = Date.now() - (24 * 60 * 60 * 1000);
    let count = 0;

    const updatedTasks = tasks.map(task => {
        const isDone = ['completed', 'failed'].includes(task.status);
        const isOld = new Date(task.updatedAt || task.timestamp || Date.now()).getTime() < cutoff;
        
        if (isDone && isOld && task.status !== 'archived') {
            console.log(`Archiving task: ${task.id || task.name}`);
            count++;
            return { ...task, status: 'archived', archivedAt: new Date().toISOString() };
        }
        return task;
    });

    if (!dryRun && count > 0) {
        fs.writeFileSync(TASKS_PATH, JSON.stringify(Array.isArray(data) ? updatedTasks : { ...data, tasks: updatedTasks }, null, 2));
        console.log(`Successfully archived ${count} tasks.`);
    } else {
        console.log(`Dry run or no tasks to archive. Found ${count} candidates.`);
    }
}

const isDry = process.argv.includes('--dry-run');
runArchive(isDry);
