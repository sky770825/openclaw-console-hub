/**
 * To integrate the deputy router into server/src/index.ts,
 * add the following lines to the main entry file:
 */

// 1. Import the new router
import deputyRouter from './deputy';

// 2. Mount the router to the specified path
// Assuming 'app' is the Express application instance
// app.use('/api/openclaw/deputy', deputyRouter);

/**
 * Example placement in index.ts:
 * 
 * import express from 'express';
 * import autoExecutorRouter from './auto-executor';
 * import deputyRouter from './deputy';
 * 
 * const app = express();
 * app.use(express.json());
 * 
 * // Existing routes
 * app.use('/api/openclaw/auto-executor', autoExecutorRouter);
 * 
 * // New route for deputy mode
 * app.use('/api/openclaw/deputy', deputyRouter);
 */
