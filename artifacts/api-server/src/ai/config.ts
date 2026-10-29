import { logger } from "../lib/logger";

export type AIProviderName = "claude" | "mock";

export interface AIConfig {
  provider: AIProviderName;
  apiKey: string | null;
  model: string;
  timeoutMs: number;
  maxAttempts: number;
  rateLimitPerMinute: number;
}

const DEFAULT_MODEL = "claude-haiku-5-5";
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_RATE_LIMIT_PER_MINUTE = 20;

function readPositiveInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    logger.warn({ name, raw, fallback }, "Invalid numeric env value, using fallback");
    return fallback;
  }
  return value;
}

function resolveProvider(apiKey: string | null): AIProviderName {
  const requested = (process.env["AI_PROVIDER"] ?? "").trim().toLowerCase();
  if (requested === "mock") return "mock";
  if (requested === "claude" && !apiKey) {
    logger.warn("AI_PROVIDER=claude but ANTHROPIC_API_KEY is missing; using mock provider");
    return "mock";
  }
  if (requested !== "" && requested !== "claude") {
    logger.warn({ requested }, "Unknown AI_PROVIDER value; falling back to automatic selection");
  }
  return apiKey ? "claude" : "mock";
}

let cached: AIConfig | null = null;

export function getAIConfig(): AIConfig {
  if (cached) return cached;
  const apiKey = process.env["ANTHROPIC_API_KEY"]?.trim() || null;
  cached = {
    provider: resolveProvider(apiKey),
    apiKey,
    model: process.env["ANTHROPIC_MODEL"]?.trim() || DEFAULT_MODEL,
    timeoutMs: readPositiveInt("AI_TIMEOUT_MS", DEFAULT_TIMEOUT_MS),
    maxAttempts: 2,
    rateLimitPerMinute: readPositiveInt("AI_RATE_LIMIT_PER_MIN", DEFAULT_RATE_LIMIT_PER_MINUTE),
  };
  logger.info(
    {
      provider: cached.provider,
      model: cached.provider === "claude" ? cached.model : null,
      timeoutMs: cached.timeoutMs,
      rateLimitPerMinute: cached.rateLimitPerMinute,
    },
    "AI configuration loaded",
  );
  return cached;
}
