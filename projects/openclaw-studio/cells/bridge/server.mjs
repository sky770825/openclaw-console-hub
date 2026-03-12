import express from 'express';
import studioRouter from './router.mjs';

const app = express();
const PORT = process.env.STUDIO_BRIDGE_PORT || 3011;

app.use(express.json());

// 依照 MASTER-PLAN.md 的通訊規格
app.use('/api/studio', studioRouter);

app.listen(PORT, () => {
  console.log(`OpenClaw Studio Bridge Cell running on http://localhost:${PORT}`);
});
