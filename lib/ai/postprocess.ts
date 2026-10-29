import { addDaysToDateString, formatDateInSeoul, weekdayForDateString } from '../clock';
import { calcExp } from '../game';
import type { ParseItem, ParseResult } from './provider';

export interface ExpandedTask extends ParseItem {
  scheduledDate: string;
  recurrenceId: string | null;
  exp: number;
}

function expandDates(item: ParseItem, today: string): string[] {
  const start = item.date && item.date >= today ? item.date : today;
  if (item.recurrence.freq === 'none') return [start];
  const until = item.recurrence.until ?? addDaysToDateString(start, 27);
  const dates: string[] = [];
  for (let date = today; date <= until; date = addDaysToDateString(date, 1)) {
    const weekday = weekdayForDateString(date);
    if (item.recurrence.freq === 'daily' || item.recurrence.byWeekday.includes(weekday)) {
      dates.push(date);
    }
  }
  return dates;
}

export function expandParseResult(result: ParseResult, current: Date): ExpandedTask[] {
  const today = formatDateInSeoul(current);
  return result.items.flatMap((item, itemIndex) => {
    if (item.kind !== 'task') return [];
    const dates = expandDates(item, today);
    const recurrenceId = item.recurrence.freq === 'none'
      ? null
      : `ai-recurrence-${today}-${itemIndex}`;
    return dates.map((scheduledDate) => ({
      ...item,
      scheduledDate,
      recurrenceId,
      exp: calcExp(item.difficulty, item.durationMin),
    }));
  });
}