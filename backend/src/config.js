import dotenv from 'dotenv';

dotenv.config();

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const config = {
  port: toNumber(process.env.PORT, 8080),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  apiKey: process.env.API_KEY || '',
  rateLimitWindowMs: toNumber(process.env.RATE_LIMIT_WINDOW_MS, 60_000),
  rateLimitMax: toNumber(process.env.RATE_LIMIT_MAX, 120),
  highFidelityBridgeUrl: process.env.HF_BRIDGE_URL || '',
  highFidelityBridgeApiKey: process.env.HF_BRIDGE_API_KEY || '',
  highFidelityBridgeTimeoutMs: toNumber(process.env.HF_BRIDGE_TIMEOUT_MS, 10_000),
};
