import { timeBand } from '../game';
import { weekdayForDateString } from '../clock';

export type PatternTimeBand = 'morning' | 'afternoon' | 'evening' | 'night';

export interface PatternEvent {
  date: string;
  startTime?: string | null;
  status: 'done' | 'failed' | 'revived';
}

export interface PatternCell {
  weekday: number;
  timeBand: PatternTimeBand;
  total: number;
  failures: number;
  failRate: number;
  risky: boolean;
  strong: boolean;
}

export interface PatternSnapshot {
  overallFailRate: number;
  cells: PatternCell[][];
}

const bands: PatternTimeBand[] = ['morning', 'afternoon', 'evening', 'night'];

export const patternTimeBandLabels: Record<PatternTimeBand, string> = {
  morning: '아침',
  afternoon: '오후',
  evening: '저녁',
  night: '밤',
};

export function failRate(events: PatternEvent[]): number {
  const failures = events.filter((event) => event.status === 'failed').length;
  return (failures + 0.3 * 5) / (events.length + 5);
}

export function getPatternTimeBand(
  startTime: string | null | undefined,
  current = new Date(),
): PatternTimeBand {
  if (startTime) return timeBand(startTime, current);
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Seoul',
      hour: '2-digit',
      hour12: false,
    }).format(current),
  );
  return timeBand(`${String(hour).padStart(2, '0')}:00`, current);
}

export function buildPatternSnapshot(events: PatternEvent[]): PatternSnapshot {
  const overallFailRate = failRate(events);
  const cells = Array.from({ length: 7 }, (_, weekday) =>
    bands.map((band) => {
      const cellEvents = events.filter(
        (event) =>
          weekdayForDateString(event.date) === weekday &&
          getPatternTimeBand(event.startTime) === band,
      );
      const rate = failRate(cellEvents);
      return {
        weekday,
        timeBand: band,
        total: cellEvents.length,
        failures: cellEvents.filter((event) => event.status === 'failed').length,
        failRate: rate,
        risky: rate >= overallFailRate + 0.15 && rate >= 0.4,
        strong: rate <= overallFailRate - 0.15,
      };
    }),
  );

  return { overallFailRate, cells };
}

export function getPatternCell(
  snapshot: PatternSnapshot,
  weekday: number,
  band: PatternTimeBand,
): PatternCell {
  return snapshot.cells[weekday]?.find((cell) => cell.timeBand === band) ?? {
    weekday,
    timeBand: band,
    total: 0,
    failures: 0,
    failRate: snapshot.overallFailRate,
    risky: false,
    strong: false,
  };
}