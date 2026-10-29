import type {
  AIProvider,
  BreakdownResult,
  ParseResult,
} from "../../../../lib/ai/provider";
import { logger } from "../lib/logger";
import { callClaudeTool, type ClaudeTool } from "./claude-client";
import type { AIConfig } from "./config";
import {
  BREAKDOWN_SYSTEM,
  BREAKDOWN_TOOL,
  PARSE_SYSTEM,
  PARSE_TOOL,
  RESPLIT_SYSTEM,
  RESPLIT_TOOL,
  buildBreakdownUserMessage,
  buildParseUserMessage,
  buildResplitUserMessage,
} from "./prompts";
import {
  AIOutputError,
  sanitizeBreakdownResult,
  sanitizeParseResult,
  sanitizeResplitResult,
} from "./sanitize";

/**
 * Calls Claude with a forced tool call and turns the tool input into the
 * shared AIProvider types. If the output cannot be used, Claude is asked once
 * more before the error is surfaced to the caller (which falls back to mock).
 */
export class ClaudeAIProvider implements AIProvider {
  private lastModel: string;

  constructor(private readonly config: AIConfig) {
    this.lastModel = config.model;
  }

  get model(): string {
    return this.lastModel;
  }

  private async run<T>(
    system: string,
    user: string,
    tool: ClaudeTool,
    maxTokens: number,
    convert: (input: unknown) => T,
  ): Promise<T> {
    let lastError: unknown = null;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const response = await callClaudeTool(this.config, { system, user, tool, maxTokens });
      this.lastModel = response.model;
      try {
        return convert(response.input);
      } catch (err) {
        lastError = err;
        logger.warn(
          { tool: tool.name, attempt, err: err instanceof Error ? err.message : String(err) },
          "Claude output failed validation",
        );
        if (!(err instanceof AIOutputError)) break;
      }
    }
    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }

  parse(text: string, current: Date): Promise<ParseResult> {
    return this.run(PARSE_SYSTEM, buildParseUserMessage(text, current), PARSE_TOOL, 2048, (input) =>
      sanitizeParseResult(input, current),
    );
  }

  breakdown(goal: string, deadline: string | null, current: Date): Promise<BreakdownResult> {
    return this.run(
      BREAKDOWN_SYSTEM,
      buildBreakdownUserMessage(goal, deadline, current),
      BREAKDOWN_TOOL,
      3072,
      (input) => sanitizeBreakdownResult(input, goal, deadline, current),
    );
  }

  resplit(title: string, current: Date): Promise<BreakdownResult> {
    return this.run(RESPLIT_SYSTEM, buildResplitUserMessage(title, current), RESPLIT_TOOL, 1536, (input) =>
      sanitizeResplitResult(input, title, current),
    );
  }
}
