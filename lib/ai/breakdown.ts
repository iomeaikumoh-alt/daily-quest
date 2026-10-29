import { addDaysToDateString, formatDateInSeoul } from '../clock';
import { calcExp } from '../game';
import type {
  BreakdownResult,
  BreakdownSubtask,
} from './provider';

export interface ProcessedBreakdownSubtask extends BreakdownSubtask {
  exp: number;
  depth: number;
  parentId?: string;
}

export interface ProcessedBreakdownResult
  extends Omit<BreakdownResult, 'subtasks'> {
  subtasks: ProcessedBreakdownSubtask[];
}

function safeDeadline(deadline: string, today: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(deadline) && deadline >= today
    ? deadline
    : addDaysToDateString(today, 14);
}

function sourceDependencyIndex(
  dependency: string,
  source: BreakdownSubtask[],
): number {
  const exact = source.findIndex((item) => item.id === dependency);
  if (exact >= 0) return exact;
  const number = Number(dependency.match(/(\d+)$/)?.[1]);
  return Number.isInteger(number) ? number - 1 : -1;
}

export function normalizeBreakdownResult(
  result: BreakdownResult,
  current: Date,
): ProcessedBreakdownResult {
  const today = formatDateInSeoul(current);
  const deadline = safeDeadline(result.deadline, today);
  const source = result.subtasks;
  const ids = source.map((_, index) => `breakdown-${index + 1}`);
  const totals = new Map<number, number>();

  const subtasks = source.map((item, index) => {
    const durationMin = Math.max(
      1,
      index === 0
        ? Math.min(30, Math.round(item.durationMin))
        : Math.round(item.durationMin),
    );
    let dayOffset = Math.max(0, Math.round(item.dayOffset));
    while ((totals.get(dayOffset) ?? 0) + durationMin > 120) {
      dayOffset += 1;
    }
    totals.set(dayOffset, (totals.get(dayOffset) ?? 0) + durationMin);

    const dependsOn = item.dependsOn
      .map((dependency) => sourceDependencyIndex(dependency, source))
      .filter((dependencyIndex) => dependencyIndex >= 0 && dependencyIndex < index)
      .map((dependencyIndex) => ids[dependencyIndex]);

    return {
      ...item,
      id: ids[index],
      durationMin,
      difficulty: Math.max(1, Math.min(5, Math.round(item.difficulty))),
      dayOffset,
      dependsOn: [...new Set(dependsOn)],
      exp: calcExp(item.difficulty, durationMin),
      depth: 0,
    };
  });

  return {
    goalTitle: result.goalTitle,
    deadline,
    assumption: result.assumption,
    subtasks,
  };
}

export function normalizeNestedBreakdown(
  result: BreakdownResult,
  current: Date,
  parent: ProcessedBreakdownSubtask,
): ProcessedBreakdownSubtask[] {
  const normalized = normalizeBreakdownResult(
    { ...result, deadline: result.deadline || addDaysToDateString(formatDateInSeoul(current), 14) },
    current,
  );
  return normalized.subtasks.map((item) => ({
    ...item,
    id: `${parent.id}-${item.id}`,
    parentId: parent.id,
    depth: parent.depth + 1,
    dayOffset: parent.dayOffset + item.dayOffset,
    dependsOn: item.dependsOn.map((dependency) => `${parent.id}-${dependency}`),
  }));
}