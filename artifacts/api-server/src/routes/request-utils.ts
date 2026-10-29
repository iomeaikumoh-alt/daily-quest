import type { Request } from "express";
import { now } from "../../../../lib/clock";

export class BadRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BadRequestError";
  }
}

export function readText(req: Request, field: string, maxLength: number): string {
  const raw: unknown = req.body?.[field];
  const value = typeof raw === "string" ? raw.replace(/\s+/g, " ").trim() : "";
  if (!value) throw new BadRequestError(`${field} is required`);
  if (value.length > maxLength) throw new BadRequestError(`${field} must be ${maxLength} characters or fewer`);
  return value;
}

export function readOptionalDate(req: Request, field: string): string | null {
  const raw: unknown = req.body?.[field];
  if (raw === undefined || raw === null || raw === "") return null;
  if (typeof raw !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    throw new BadRequestError(`${field} must be YYYY-MM-DD or null`);
  }
  return raw;
}

/** Clients may pass their (demo) clock; an invalid value falls back to server time. */
export function readNow(req: Request): Date {
  const raw: unknown = req.body?.now;
  if (typeof raw !== "string") return now();
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? now() : parsed;
}
