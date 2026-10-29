import {
  BreakdownGoalResponse,
  ParseNaturalLanguageResponse,
  ResplitTaskResponse,
} from "@workspace/api-zod";
import { mockAIProvider } from "../../../../lib/ai";
import type { BreakdownResult, ParseResult } from "../../../../lib/ai/provider";
import { logger } from "../lib/logger";
import { ClaudeAIProvider } from "./claude-provider";
import { getAIConfig } from "./config";

export type AISource = "claude" | "mock";

export interface AIMeta {
  source: AISource;
  model: string | null;
  fallbackReason: string | null;
}

export type ParseResponse = ParseResult & AIMeta;
export type BreakdownResponse = BreakdownResult & AIMeta;

let claudeProvider: ClaudeAIProvider | null = null;

function getClaudeProvider(): ClaudeAIProvider | null {
  const config = getAIConfig();
  if (config.provider !== "claude") return null;
  claudeProvider ??= new ClaudeAIProvider(config);
  return claudeProvider;
}

function reasonOf(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  return message.length > 200 ? `${message.slice(0, 200)}…` : message;
}

async function withFallback<T>(
  operation: string,
  viaClaude: (provider: ClaudeAIProvider) => Promise<T>,
  viaMock: () => Promise<T>,
): Promise<T & AIMeta> {
  const provider = getClaudeProvider();
  if (provider) {
    try {
      const result = await viaClaude(provider);
      return { ...result, source: "claude", model: provider.model, fallbackReason: null };
    } catch (err) {
      const fallbackReason = reasonOf(err);
      logger.warn({ operation, fallbackReason }, "Claude unavailable, falling back to mock AI");
      const result = await viaMock();
      return { ...result, source: "mock", model: null, fallbackReason };
    }
  }
  const result = await viaMock();
  return { ...result, source: "mock", model: null, fallbackReason: null };
}

const mockLatency = () => new Promise((resolve) => setTimeout(resolve, 800 + Math.floor(Math.random() * 401)));

export async function parseText(text: string, current: Date): Promise<ParseResponse> {
  const response = await withFallback(
    "parse",
    (provider) => provider.parse(text, current),
    async () => {
      // Keeps the original demo feel of a thinking delay when no LLM is configured.
      if (getAIConfig().provider === "mock") await mockLatency();
      return mockAIProvider.parse(text, current);
    },
  );
  ParseNaturalLanguageResponse.parse(response);
  return response;
}

export async function breakdownGoal(goal: string, deadline: string | null, current: Date): Promise<BreakdownResponse> {
  const response = await withFallback(
    "breakdown",
    (provider) => provider.breakdown(goal, deadline, current),
    () => mockAIProvider.breakdown(goal, deadline, current),
  );
  BreakdownGoalResponse.parse(response);
  return response;
}

export async function resplitTask(title: string, current: Date): Promise<BreakdownResponse> {
  const response = await withFallback(
    "resplit",
    (provider) => provider.resplit(title, current),
    () => mockAIProvider.resplit(title, current),
  );
  ResplitTaskResponse.parse(response);
  return response;
}
