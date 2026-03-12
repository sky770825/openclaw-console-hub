import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function clearZombies() {
    console.log('--- Zombie Task Cleanup Execution ---');
    const runningTasks = await prisma.task.findMany({
        where: { status: 'RUNNING' }
    });

    let clearedCount = 0;
    for (const task of runningTasks) {
        let alive = false;
        if (task.pid) {
            try {
                process.kill(task.pid, 0);
                alive = true;
            } catch (e) {}
        }

        if (!alive) {
            await prisma.task.update({
                where: { id: task.id },
                data: { status: 'FAILED', error: 'Zombie process detected and cleared' }
            });
            clearedCount++;
        }
    }
    console.log(`Cleanup complete. Cleared ${clearedCount} zombie tasks.`);
}

clearZombies().catch(console.error);
