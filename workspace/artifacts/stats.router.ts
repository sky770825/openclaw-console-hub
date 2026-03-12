import { Router } from 'express';
import { StatsService } from './stats.service';

const router = Router();
const statsService = new StatsService();

/**
 * @route POST /api/community/stats/track
 * @desc  Record a visitor page view
 */
router.post('/track', async (req, res) => {
    try {
        const { visitor_id, page_path, region, referrer } = req.body;
        const user_agent = req.headers['user-agent'];
        
        await statsService.trackVisit({
            visitor_id,
            page_path,
            region,
            referrer,
            user_agent
        });
        
        res.status(201).json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to track visit' });
    }
});

/**
 * @route GET /api/community/stats/summary
 * @desc  Get daily/weekly/monthly statistics and regional analysis
 */
router.get('/summary', async (req, res) => {
    try {
        const range = req.query.range as string || 'daily'; // daily, weekly, monthly
        const stats = await statsService.getStatsSummary(range);
        const regional = await statsService.getRegionalAnalysis();
        
        res.json({
            range,
            stats,
            regional
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

export default router;
