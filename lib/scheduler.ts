export type BreakdownCycle = 'daily' | 'weekly' | 'monthly';
export type BreakdownCategory = 'health' | 'life' | 'study';
export type BreakdownMetric =
  | 'steps'
  | 'sleep'
  | 'weight'
  | 'medication'
  | 'none';

export interface SchedulerGoal {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  color: string;
}

export interface BreakdownQuest {
  id: string;
  title: string;
  cycle: BreakdownCycle;
  category: BreakdownCategory;
  exp: number;
  autoClear: {
    enabled: boolean;
    metric: BreakdownMetric;
    operator: '>=' | '<=';
    value: number;
    unit: string;
  };
}

export interface ScheduledQuest {
  id: string;
  title: string;
  category: BreakdownCategory;
  reward: number;
  autoClear: BreakdownQuest['autoClear'];
  scheduledDate: string;
  goalId: string;
  status: 'pending';
  completed: false;
}

const toUtcDate = (dateString: string) => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};

const toDateString = (date: Date) =>
  date.toISOString().slice(0, 10);

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

const isWithinGoal = (date: Date, goal: SchedulerGoal) => {
  const start = toUtcDate(goal.startDate).getTime();
  const end = toUtcDate(goal.endDate).getTime();
  const value = date.getTime();
  return value >= start && value <= end;
};

const datesForCycle = (
  cycle: BreakdownCycle,
  goal: SchedulerGoal,
): string[] => {
  const start = toUtcDate(goal.startDate);
  const end = toUtcDate(goal.endDate);
  const dates: string[] = [];

  if (cycle === 'daily') {
    for (let date = start; date <= end; date = addDays(date, 1)) {
      dates.push(toDateString(date));
    }
    return dates;
  }

  if (cycle === 'weekly') {
    const targetWeekday = start.getUTCDay();
    for (let date = start; date <= end; date = addDays(date, 1)) {
      if (date.getUTCDay() === targetWeekday) {
        dates.push(toDateString(date));
      }
    }
    return dates;
  }

  for (
    let date = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
    date <= end;
    date = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1))
  ) {
    if (isWithinGoal(date, goal)) {
      dates.push(toDateString(date));
    }
  }
  return dates;
};

export function scheduleBreakdownQuests(
  goal: SchedulerGoal,
  breakdown: BreakdownQuest[],
): ScheduledQuest[] {
  return breakdown.flatMap((quest) =>
    datesForCycle(quest.cycle, goal).map((scheduledDate) => ({
      id: `${goal.id}-${quest.id}-${scheduledDate}`,
      title: quest.title,
      category: quest.category,
      reward: Math.max(0, Math.min(50, quest.exp)),
      autoClear: quest.autoClear,
      scheduledDate,
      goalId: goal.id,
      status: 'pending' as const,
      completed: false as const,
    })),
  );
}