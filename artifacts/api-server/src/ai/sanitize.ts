import { addDaysToDateString, formatDateInSeoul, weekdayForDateString } from "../../../../lib/clock";
import type {
  BreakdownResult,
  BreakdownSubtask,
  ParseItem,
  ParseRecurrence,
  ParseResult,
} from "../../../../lib/ai/provider";

export class AIOutputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AIOutputError";
  }
}

type UnknownRecord = Record<string, unknown>;

const UNCERTAIN_KEYS = new Set(["date", "startTime", "durationMin", "location"]);

function asRecord(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as UnknownRecord) : null;
}

function asString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (!trimmed) return null;
  return trimmed.length > maxLength ? trimmed.slice(0, maxLength).trim() : trimmed;
}

function asInt(value: unknown, min: number, max: number): number | null {
  const number = typeof value === "string" ? Number(value) : value;
  if (typeof number !== "number" || !Number.isFinite(number)) return null;
  return Math.min(max, Math.max(min, Math.round(number)));
}

export function isValidDateString(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function asTime(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function daysBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000);
}

function sanitizeRecurrence(value: unknown, date: string): ParseRecurrence {
  const raw = asRecord(value);
  const freq = raw?.["freq"];
  if (freq !== "daily" && freq !== "weekly") return { freq: "none", byWeekday: [], until: null };

  const until = isValidDateString(raw?.["until"]) && (raw?.["until"] as string) >= date ? (raw?.["until"] as string) : null;
  if (freq === "daily") return { freq, byWeekday: [], until };

  const weekdays = Array.isArray(raw?.["byWeekday"])
    ? (raw?.["byWeekday"] as unknown[]).filter(
        (day): day is number => Number.isInteger(day) && (day as number) >= 0 && (day as number) <= 6,
      )
    : [];
  const byWeekday = [...new Set(weekdays)].sort((a, b) => a - b);
  return { freq, byWeekday: byWeekday.length ? byWeekday : [weekdayForDateString(date)], until };
}

function sanitizeParseItem(value: unknown, today: string): ParseItem | null {
  const raw = asRecord(value);
  if (!raw) return null;
  const title = asString(raw["title"], 40);
  if (!title) return null;

  const uncertain = new Set(
    Array.isArray(raw["uncertain"])
      ? (raw["uncertain"] as unknown[]).filter((key): key is string => typeof key === "string" && UNCERTAIN_KEYS.has(key))
      : [],
  );

  let date = isValidDateString(raw["date"]) ? (raw["date"] as string) : null;
  if (!date || date < today) {
    date = today;
    uncertain.add("date");
  }

  const rawDuration = asInt(raw["durationMin"], 5, 480);
  if (rawDuration === null) uncertain.add("durationMin");

  return {
    kind: raw["kind"] === "bigGoal" ? "bigGoal" : "task",
    title,
    date,
    startTime: asTime(raw["startTime"]),
    durationMin: rawDuration ?? 30,
    location: asString(raw["location"], 40),
    note: asString(raw["note"], 200),
    difficulty: asInt(raw["difficulty"], 1, 5) ?? 2,
    recurrence: sanitizeRecurrence(raw["recurrence"], date),
    uncertain: [...uncertain],
  };
}

export function sanitizeParseResult(value: unknown, current: Date): ParseResult {
  const raw = asRecord(value);
  const rawItems = Array.isArray(raw?.["items"]) ? (raw?.["items"] as unknown[]) : [];
  const today = formatDateInSeoul(current);
  const items = rawItems
    .slice(0, 10)
    .map((item) => sanitizeParseItem(item, today))
    .filter((item): item is ParseItem => item !== null);
  if (items.length === 0) {
    throw new AIOutputError("Claude returned no usable quest items");
  }
  return { items };
}

interface BreakdownLimits {
  minSubtasks: number;
  maxSubtasks: number;
  maxDurationMin: number;
  maxDayOffset: number | null;
}

function sanitizeSubtasks(
  rawSubtasks: unknown[],
  limits: BreakdownLimits,
  deadlineOffset: number,
): BreakdownSubtask[] {
  const usable = rawSubtasks
    .map(asRecord)
    .filter((item): item is UnknownRecord => item !== null && asString(item["title"], 40) !== null)
    .slice(0, limits.maxSubtasks);

  if (usable.length < limits.minSubtasks) {
    throw new AIOutputError(`Claude returned ${usable.length} usable subtasks (need ${limits.minSubtasks})`);
  }

  const idMap = new Map<string, string>();
  usable.forEach((item, index) => {
    const rawId = typeof item["id"] === "string" || typeof item["id"] === "number" ? String(item["id"]) : null;
    if (rawId && !idMap.has(rawId)) idMap.set(rawId, String(index + 1));
  });

  const maxOffset = Math.max(0, limits.maxDayOffset ?? deadlineOffset);

  return usable.map((item, index) => {
    const id = String(index + 1);
    const dependsOn = Array.isArray(item["dependsOn"])
      ? (item["dependsOn"] as unknown[])
          .map((dependency) => idMap.get(String(dependency)))
          .filter((dependency): dependency is string => dependency !== undefined && Number(dependency) < index + 1)
      : [];
    return {
      id,
      title: asString(item["title"], 40) as string,
      doneWhen: asString(item["doneWhen"], 120) ?? "결과물을 확인할 수 있다",
      durationMin: asInt(item["durationMin"], 5, limits.maxDurationMin) ?? 30,
      difficulty: asInt(item["difficulty"], 1, 5) ?? 2,
      dayOffset: asInt(item["dayOffset"], 0, maxOffset) ?? Math.min(index, maxOffset),
      dependsOn: [...new Set(dependsOn)],
      starterStep: asString(item["starterStep"], 120) ?? "필요한 자료 하나를 눈앞에 꺼내 두기",
    };
  });
}

export function sanitizeBreakdownResult(
  value: unknown,
  goal: string,
  requestedDeadline: string | null,
  current: Date,
): BreakdownResult {
  const raw = asRecord(value);
  if (!raw) throw new AIOutputError("Claude breakdown output was not an object");
  const today = formatDateInSeoul(current);

  const userDeadline =
    isValidDateString(requestedDeadline) && requestedDeadline >= today ? requestedDeadline : null;
  const modelDeadline =
    isValidDateString(raw["deadline"]) && (raw["deadline"] as string) >= today ? (raw["deadline"] as string) : null;
  // A deadline the user stated always wins over one the model picked.
  const deadline = userDeadline ?? modelDeadline ?? addDaysToDateString(today, 14);

  const subtasks = sanitizeSubtasks(
    Array.isArray(raw["subtasks"]) ? (raw["subtasks"] as unknown[]) : [],
    { minSubtasks: 3, maxSubtasks: 10, maxDurationMin: 120, maxDayOffset: null },
    daysBetween(today, deadline),
  );

  return {
    goalTitle: asString(raw["goalTitle"], 40) ?? goal.slice(0, 40),
    deadline,
    assumption: asString(raw["assumption"], 160),
    subtasks,
  };
}

export function sanitizeResplitResult(value: unknown, title: string, current: Date): BreakdownResult {
  const raw = asRecord(value);
  if (!raw) throw new AIOutputError("Claude resplit output was not an object");
  const today = formatDateInSeoul(current);
  const subtasks = sanitizeSubtasks(
    Array.isArray(raw["subtasks"]) ? (raw["subtasks"] as unknown[]) : [],
    { minSubtasks: 2, maxSubtasks: 4, maxDurationMin: 45, maxDayOffset: 1 },
    1,
  );
  return {
    goalTitle: title,
    deadline: addDaysToDateString(today, 14),
    assumption: null,
    subtasks,
  };
}
