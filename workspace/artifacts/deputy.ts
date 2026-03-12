import { Router, Request, Response } from 'express';

const router = Router();

/**
 * Mocking a state store. In a real application, this might be persisted 
 * in a database or a shared state service.
 */
let deputyState = {
  enabled: false,
  level: 'standard', // default level
  lastUpdated: new Date().toISOString()
};

/**
 * GET /api/openclaw/deputy/status
 * Returns the current status of the deputy mode.
 */
router.get('/status', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: deputyState
  });
});

/**
 * POST /api/openclaw/deputy/toggle
 * Toggles the deputy mode on or off.
 */
router.post('/toggle', (req: Request, res: Response) => {
  deputyState.enabled = !deputyState.enabled;
  deputyState.lastUpdated = new Date().toISOString();
  
  res.json({
    success: true,
    message: `Deputy mode ${deputyState.enabled ? 'enabled' : 'disabled'}`,
    data: { enabled: deputyState.enabled }
  });
});

/**
 * POST /api/openclaw/deputy/level
 * Switches the deputy operation level.
 * Expected body: { level: 'basic' | 'standard' | 'advanced' }
 */
router.post('/level', (req: Request, res: Response) => {
  const { level } = req.body;
  
  const validLevels = ['basic', 'standard', 'advanced'];
  
  if (!level || !validLevels.includes(level)) {
    return res.status(400).json({
      success: false,
      message: `Invalid level. Must be one of: ${validLevels.join(', ')}`
    });
  }

  deputyState.level = level;
  deputyState.lastUpdated = new Date().toISOString();

  res.json({
    success: true,
    message: `Deputy level set to ${level}`,
    data: { level: deputyState.level }
  });
});

export default router;
