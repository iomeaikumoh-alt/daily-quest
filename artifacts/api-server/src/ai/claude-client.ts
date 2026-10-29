import { logger } from "../lib/logger";
import type { AIConfig } from "./config";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

export interface ClaudeTool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface ClaudeToolRequest {
  system: string;
  user: string;
  tool: ClaudeTool;
  maxTokens: number;
}

export interface ClaudeToolResponse {
  input: unknown;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
}

export class ClaudeApiError extends Error {
  readonly status: number | null;
  readonly retryable: boolean;

  constructor(message: string, status: number | null, retryable: boolean) {
    super(message);
    this.name = "ClaudeApiError";
    this.status = status;
    this.retryable = retryable;
  }
}

interface AnthropicContentBlock {
  type: string;
  name?: string;
  input?: unknown;
  text?: string;
}

interface AnthropicMessageResponse {
  model?: string;
  stop_reason?: string | null;
  content?: AnthropicContentBlock[];
  usage?: { input_tokens?: number; output_tokens?: number };
}

interface AnthropicErrorResponse {
  error?: { type?: string; message?: string };
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 409 || status === 429 || status >= 500;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as AnthropicErrorResponse;
    return body.error?.message ?? `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
}

async function callOnce(config: AIConfig, request: ClaudeToolRequest): Promise<ClaudeToolResponse> {
  if (!config.apiKey) {
    throw new ClaudeApiError("ANTHROPIC_API_KEY is not configured", null, false);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  let response: Response;
  try {
    response = await fetch(ANTHROPIC_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": config.apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: request.maxTokens,
        system: request.system,
        messages: [{ role: "user", content: request.user }],
        tools: [request.tool],
        tool_choice: { type: "tool", name: request.tool.name },
      }),
    });
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    throw new ClaudeApiError(
      aborted ? `Claude request timed out after ${config.timeoutMs}ms` : `Claude request failed: ${String(err)}`,
      null,
      true,
    );
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const message = await readErrorMessage(response);
    throw new ClaudeApiError(`Claude API error ${response.status}: ${message}`, response.status, isRetryableStatus(response.status));
  }

  let body: AnthropicMessageResponse;
  try {
    body = (await response.json()) as AnthropicMessageResponse;
  } catch (err) {
    throw new ClaudeApiError(`Claude response was not valid JSON: ${String(err)}`, response.status, true);
  }

  if (body.stop_reason === "max_tokens") {
    throw new ClaudeApiError("Claude response was cut off by max_tokens", response.status, false);
  }

  const toolBlock = body.content?.find(
    (block) => block.type === "tool_use" && block.name === request.tool.name,
  );
  if (!toolBlock || toolBlock.input === undefined) {
    throw new ClaudeApiError("Claude response did not include the expected tool call", response.status, true);
  }

  return {
    input: toolBlock.input,
    model: body.model ?? config.model,
    inputTokens: body.usage?.input_tokens ?? null,
    outputTokens: body.usage?.output_tokens ?? null,
  };
}

export async function callClaudeTool(config: AIConfig, request: ClaudeToolRequest): Promise<ClaudeToolResponse> {
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= config.maxAttempts; attempt += 1) {
    const startedAt = Date.now();
    try {
      const result = await callOnce(config, request);
      logger.info(
        {
          tool: request.tool.name,
          model: result.model,
          attempt,
          ms: Date.now() - startedAt,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
        },
        "Claude tool call succeeded",
      );
      return result;
    } catch (err) {
      lastError = err;
      const retryable = err instanceof ClaudeApiError ? err.retryable : false;
      logger.warn(
        {
          tool: request.tool.name,
          attempt,
          ms: Date.now() - startedAt,
          retryable,
          err: err instanceof Error ? err.message : String(err),
        },
        "Claude tool call failed",
      );
      if (!retryable || attempt === config.maxAttempts) break;
      await sleep(400 * attempt);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
