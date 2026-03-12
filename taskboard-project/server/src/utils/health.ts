import { supabase, checkSupabaseHealth } from '../lib/supabase.js';
import { aiMemoryStore } from '../services/aiMemoryStore.js';

const startTime = Date.now();

export const getEnhancedHealth = async () => {
  const supabaseOk = await checkSupabaseHealth();
  const memoryUsage = process.memoryUsage();
  const uptime = Math.floor((Date.now() - startTime) / 1000);
  
  // Note: WebSocket count would normally come from a WebSocket server instance
  // Since we don't have one visible in index.ts, we'll return a placeholder or 0
  const wsConnections = 0; 

  return {
    status: supabaseOk ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    version: "1.2.0-enhanced",
    uptime: `${uptime}s`,
    services: {
      supabase: supabaseOk ? "connected" : "disconnected",
      aiMemory: aiMemoryStore.getHealth()
    },
    metrics: {
      memory: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`,
      },
      wsConnections,
      cpuLoad: process.cpuUsage()
    },
    security: {
      basicAuthEnabled: !!process.env.OPENCLAW_DASHBOARD_BASIC_USER,
      writeProtectionEnabled: !!process.env.OPENCLAW_API_KEY
    }
  };
};
