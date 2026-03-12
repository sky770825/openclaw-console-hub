import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../lib/supabase.js';
import { logger } from '../utils/logger.js';
import { COMMUNITY_LAYERS, JWT_SECRET } from '../config/communityLayers.js';
import { sendTelegramNotification } from '../services/reportService.js';

const router = Router();

// POST /trust/promote - Promote L2 -> L3
router.post('/trust/promote', async (req, res) => {
  const { userId, adminSecret } = req.body;

  // 1. Admin Check (Simple secret for now, or JWT from admin)
  if (adminSecret !== process.env.OPENCLAW_API_KEY) {
    return res.status(403).json({ error: 'Unauthorized: Admin access required' });
  }

  try {
    // 2. Fetch User Data (Assuming 'collaborators' table)
    const { data: user, error: userError } = await supabase
      .from('collaborators')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      logger.warn({ category: 'community', userId, error: userError }, 'User not found for promotion');
      return res.status(404).json({ error: 'User not found' });
    }

    // 3. Check Criteria
    // a. Current Level must be L2
    if (user.level < 2) {
      return res.status(400).json({ error: 'User must be at least L2 to promote to L3' });
    }
    if (user.level >= 3) {
      return res.status(200).json({ message: 'User is already L3 or higher', level: user.level });
    }

    // b. Activity & Tasks
    // Calculate days active from created_at or first_active_at
    const startTime = new Date(user.created_at || user.first_active_at || Date.now()).getTime();
    const daysActive = (Date.now() - startTime) / (1000 * 60 * 60 * 24);
    
    // Count completed tasks where owner == user.username
    const { count: tasksDone } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('owner', user.username) // Assuming username matches
      .eq('status', 'done');

    const criteria = COMMUNITY_LAYERS.L2.promotionCriteria;

    if (daysActive < criteria.minActiveDays) {
      return res.status(400).json({ 
        error: `Insufficient activity. Required: ${criteria.minActiveDays} days, Current: ${Math.floor(daysActive)}` 
      });
    }

    if ((tasksDone || 0) < criteria.minTasksCompleted) {
       return res.status(400).json({
         error: `Insufficient completed tasks. Required: ${criteria.minTasksCompleted}, Current: ${tasksDone || 0}`
       });
    }

    // 4. Update Level
    const { error: updateError } = await supabase
      .from('collaborators')
      .update({ level: 3, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (updateError) throw updateError;

    // 5. Generate L3 Token
    const token = jwt.sign(
      { 
        id: userId, 
        level: 3, 
        role: 'L3_Trust_Member',
        exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 30) // 30 days
      },
      JWT_SECRET
    );

    // 6. Record History (Fire & Forget or Await)
    await supabase.from('promotion_history').insert({
      user_id: userId,
      from_level: 2,
      to_level: 3,
      reason: 'Automated check passed + Admin approval',
      promoted_by: 'admin',
      timestamp: new Date().toISOString()
    });

    logger.info({ category: 'community', userId, action: 'promote', level: 3 }, 'User promoted to L3');

    res.json({
      success: true,
      message: 'User promoted to L3',
      token,
      validity: '30 days'
    });

  } catch (err) {
    logger.error({ category: 'community', error: err }, 'Promotion failed');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// Task 3: L0 Public Stats
// ============================================================================

// GET /stats - Public Visitor Statistics
router.get('/stats', async (_req, res) => {
  try {
    // 1. Get Today's Visits
    const today = new Date().toISOString().split('T')[0];
    const { count: dailyVisits } = await supabase
      .from('community_stats')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'page_view')
      .gte('created_at', today);

    // 2. Get Total Members (L1+)
    const { count: totalMembers } = await supabase
      .from('collaborators')
      .select('*', { count: 'exact', head: true });

    res.json({
      dailyVisits: dailyVisits || 0,
      totalMembers: totalMembers || 0,
      activeProjects: 11, // Static for now based on context
      systemStatus: 'operational'
    });
  } catch (err) {
    logger.error({ category: 'community', error: err }, 'Failed to fetch stats');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /stats/view - Record Page View
router.post('/stats/view', async (req, res) => {
  const { page, referrer, country } = req.body;
  try {
    await supabase.from('community_stats').insert({
      type: 'page_view',
      page: page || '/',
      referrer,
      country,
      ip: req.ip,
      user_agent: req.headers['user-agent'],
      created_at: new Date().toISOString()
    });
    res.status(200).send({ success: true });
  } catch (err) {
    // Fail silently for stats recording to not block UI
    logger.warn({ category: 'community', error: err }, 'Failed to record page view');
    res.status(200).send({ success: false });
  }
});

// ============================================================================
// Task 4: L1 Applicant Form
// ============================================================================

// POST /apply - Submit Application
router.post('/apply', async (req, res) => {
  const { name, skills, motivation, contact } = req.body;

  if (!name || !motivation) {
    return res.status(400).json({ error: 'Name and motivation are required' });
  }

  try {
    // 1. Save to Supabase
    const { data, error } = await supabase
      .from('community_applications')
      .insert({
        name,
        skills,
        motivation,
        contact,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    // 2. Notify Boss via Telegram
    const message = `
📝 *新協作者申請 (New Applicant)*

👤 姓名: ${name}
🛠 技能: ${skills || '未填寫'}
💡 動機: ${motivation}
📞 聯絡: ${contact || '未填寫'}

請至後台審核: /admin/applications/${data.id}
    `.trim();

    await sendTelegramNotification(message);

    res.status(201).json({ 
      success: true, 
      message: 'Application submitted successfully', 
      applicationId: data.id 
    });

  } catch (err) {
    logger.error({ category: 'community', error: err }, 'Application submission failed');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as communityRouter };
