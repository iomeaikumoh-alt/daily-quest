export type ParseItemKind = 'task' | 'bigGoal';
export type RecurrenceFrequency = 'none' | 'daily' | 'weekly';

export interface ParseRecurrence {
  freq: RecurrenceFrequency;
  byWeekday: number[];
  until: string | null;
}

export interface ParseItem {
  kind: ParseItemKind;
  title: string;
  date: string | null;
  startTime: string | null;
  durationMin: number;
  location: string | null;
  note: string | null;
  difficulty: number;
  recurrence: ParseRecurrence;
  uncertain: string[];
}

export interface ParseResult {
  items: ParseItem[];
}

export interface BreakdownSubtask {
  id: string;
  title: string;
  doneWhen: string;
  durationMin: number;
  difficulty: number;
  dayOffset: number;
  dependsOn: string[];
  starterStep: string;
}

export interface BreakdownResult {
  goalTitle: string;
  deadline: string;
  assumption: string | null;
  subtasks: BreakdownSubtask[];
}

export interface AIProvider {
  parse(text: string, current: Date): Promise<ParseResult>;
  breakdown(goal: string, deadline: string | null, current: Date): Promise<BreakdownResult>;
  resplit(title: string, current: Date): Promise<BreakdownResult>;
}