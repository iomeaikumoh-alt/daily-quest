import { addDaysToDateString, formatDateInSeoul, weekdayForDateString } from '../clock';
import type {
  AIProvider,
  BreakdownResult,
  BreakdownSubtask,
  ParseItem,
  ParseRecurrence,
  ParseResult,
} from './provider';

const weekdayMap: Record<string, number> = {
  일: 0,
  월: 1,
  화: 2,
  수: 3,
  목: 4,
  금: 5,
  토: 6,
};

const emptyRecurrence = (): ParseRecurrence => ({
  freq: 'none',
  byWeekday: [],
  until: null,
});

const normalize = (value: string) => value.replace(/\s+/g, ' ').trim();

function nextWeekdayDate(today: string, target: number, nextWeek = false): string {
  const current = weekdayForDateString(today);
  let delta = (target - current + 7) % 7;
  if (nextWeek) delta += 7;
  return addDaysToDateString(today, delta);
}

function findDate(text: string, today: string): { date: string; uncertain: boolean } {
  if (/오늘/.test(text)) return { date: today, uncertain: false };
  if (/모레/.test(text)) return { date: addDaysToDateString(today, 2), uncertain: false };
  if (/내일/.test(text)) return { date: addDaysToDateString(today, 1), uncertain: false };

  const monthDay = text.match(/(\d{1,2})월\s*(\d{1,2})일/);
  if (monthDay) {
    const month = Number(monthDay[1]);
    const day = Number(monthDay[2]);
    const year = Number(today.slice(0, 4));
    const candidate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return { date: candidate, uncertain: false };
  }

  const slashDay = text.match(/(?:^|\s)(\d{1,2})\/(\d{1,2})(?:\s|$)/);
  if (slashDay) {
    const year = Number(today.slice(0, 4));
    const candidate = `${year}-${String(Number(slashDay[1])).padStart(2, '0')}-${String(Number(slashDay[2])).padStart(2, '0')}`;
    return { date: candidate, uncertain: false };
  }

  const weekday = text.match(/(이번주|이번 주|다음주|다음 주)\s*([일월화수목금토])요일/);
  if (weekday) {
    return {
      date: nextWeekdayDate(today, weekdayMap[weekday[2]], weekday[1].replace(/\s/g, '') === '다음주'),
      uncertain: false,
    };
  }

  return { date: today, uncertain: true };
}

function findTime(text: string): { time: string | null; uncertain: boolean } {
  const clock = text.match(/(?:^|\s)(\d{1,2}):(\d{2})(?:\s|$)/);
  if (clock) {
    return {
      time: `${String(Number(clock[1])).padStart(2, '0')}:${clock[2]}`,
      uncertain: false,
    };
  }

  const meridiem = text.match(/(오전|오후)\s*(\d{1,2})시(?:\s*(\d{1,2})분?)?/);
  if (meridiem) {
    let hour = Number(meridiem[2]);
    if (meridiem[1] === '오후' && hour < 12) hour += 12;
    if (meridiem[1] === '오전' && hour === 12) hour = 0;
    return {
      time: `${String(hour).padStart(2, '0')}:${String(Number(meridiem[3] ?? 0)).padStart(2, '0')}`,
      uncertain: false,
    };
  }

  const hourOnly = text.match(/(?:^|\s)(\d{1,2})시(?:\s*(\d{1,2})분?)?/);
  if (hourOnly) {
    return {
      time: `${String(Number(hourOnly[1])).padStart(2, '0')}:${String(Number(hourOnly[2] ?? 0)).padStart(2, '0')}`,
      uncertain: false,
    };
  }

  const approximate: Array<[RegExp, string]> = [
    [/아침/, '09:00'],
    [/점심/, '12:00'],
    [/오후/, '15:00'],
    [/저녁/, '19:00'],
    [/밤/, '22:00'],
  ];
  const match = approximate.find(([pattern]) => pattern.test(text));
  return match ? { time: match[1], uncertain: true } : { time: null, uncertain: false };
}

function findDuration(text: string): { duration: number; uncertain: boolean } {
  const hour = text.match(/(\d+(?:\.\d+)?)\s*시간/);
  const minute = text.match(/(\d+)\s*분/);
  if (hour) return { duration: Math.round(Number(hour[1]) * 60) + (minute ? Number(minute[1]) : 0), uncertain: false };
  if (minute) return { duration: Number(minute[1]), uncertain: false };
  return { duration: 30, uncertain: true };
}

function findRecurrence(text: string): ParseRecurrence {
  if (/매일/.test(text)) return { freq: 'daily', byWeekday: [], until: null };
  if (!/매주/.test(text)) return emptyRecurrence();
  const weekdays = [...text.matchAll(/[일월화수목금토](?=요일|[일월화수목금토]|$)/g)]
    .map((match) => weekdayMap[match[0]])
    .filter((value, index, values) => values.indexOf(value) === index);
  return { freq: 'weekly', byWeekday: weekdays.length ? weekdays : [1], until: null };
}

function cleanTitle(text: string, location: string | null): string {
  let title = text;
  title = title
    .replace(/(?:오늘|내일|모레|이번\s*주|다음\s*주|이번주|다음주)\s*/g, '')
    .replace(/까지/g, '')
    .replace(/매일|매주/g, '')
    .replace(/[일월화수목금토]요일/g, '')
    .replace(/(?:오전|오후)\s*\d{1,2}시(?:\s*\d{1,2}분?)?/g, '')
    .replace(/\d{1,2}:\d{2}/g, '')
    .replace(/\d{1,2}시(?:\s*\d{1,2}분?)?/g, '')
    .replace(/아침|점심|저녁|밤|오후/g, '')
    .replace(/\d+(?:\.\d+)?\s*시간/g, '')
    .replace(/\d+\s*분/g, '')
    .replace(location ? new RegExp(`${location}\\s*에서`) : /$^/, '')
    .replace(/에서/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^[은는이가을를엔에,\s]+|[은는이가을를엔에,\s]+$/g, '')
    .trim();
  return title || '새 퀘스트';
}

function makeItem(text: string, today: string, forced?: Partial<ParseItem>): ParseItem {
  const dateInfo = findDate(text, today);
  const timeInfo = findTime(text);
  const durationInfo = findDuration(text);
  const recurrence = findRecurrence(text);
  const locationMatch = text.match(/([가-힣A-Za-z0-9]+)\s*에서/);
  const location = locationMatch?.[1] ?? null;
  const date = dateInfo.date < today ? today : dateInfo.date;
  const uncertain = [
    ...(dateInfo.uncertain ? ['date'] : []),
    ...(timeInfo.uncertain ? ['startTime'] : []),
    ...(durationInfo.uncertain ? ['durationMin'] : []),
    ...(dateInfo.date < today ? ['date'] : []),
  ];
  const title = cleanTitle(text, location);
  const item: ParseItem = {
    kind: /달성|완성|합격|한 달|한달|\d+주 안에|까지/.test(text) ? 'bigGoal' : 'task',
    title,
    date,
    startTime: timeInfo.time,
    durationMin: durationInfo.duration,
    location,
    note: null,
    difficulty: durationInfo.duration >= 60 ? 3 : 2,
    recurrence,
    uncertain: [...new Set(uncertain)],
  };
  return { ...item, ...forced };
}

function demoItems(text: string, today: string): ParseResult | null {
  const normalized = normalize(text);
  const tomorrow = addDaysToDateString(today, 1);
  if (normalized === '내일 아침 9시 도서관에서 토익 LC 1시간') {
    return { items: [makeItem(normalized, today, { title: '토익 LC', date: tomorrow, startTime: '09:00', durationMin: 60, location: '도서관', difficulty: 3, uncertain: [] })] };
  }
  if (normalized === '내일 오전엔 토익, 오후 3시에 조별과제 회의, 저녁엔 헬스') {
    return {
      items: [
        makeItem('내일 오전 토익', today, { title: '토익', date: tomorrow, startTime: '09:00', durationMin: 30, uncertain: ['startTime', 'durationMin'] }),
        makeItem('내일 오후 3시 조별과제 회의', today, { title: '조별과제 회의', date: tomorrow, startTime: '15:00', durationMin: 30, uncertain: ['durationMin'] }),
        makeItem('내일 저녁 헬스', today, { title: '헬스', date: tomorrow, startTime: '19:00', durationMin: 30, uncertain: ['startTime', 'durationMin'] }),
      ],
    };
  }
  if (normalized === '매주 화목 저녁 7시 헬스 1시간') {
    return {
      items: [makeItem(normalized, today, {
        title: '헬스',
        date: today,
        startTime: '19:00',
        durationMin: 60,
        difficulty: 3,
        recurrence: { freq: 'weekly', byWeekday: [2, 4], until: null },
        uncertain: [],
      })],
    };
  }
  return null;
}

const cloneBreakdown = (
  goalTitle: string,
  subtasks: Array<Omit<BreakdownSubtask, 'id'>>,
): BreakdownSubtask[] =>
  subtasks.map((subtask, index) => ({
    ...subtask,
    id: `${goalTitle}-${index + 1}`,
    dependsOn: subtask.dependsOn.map((dependency) => `${goalTitle}-${dependency}`),
  }));

const mvpBreakdown = (goalTitle: string): BreakdownSubtask[] =>
  cloneBreakdown(goalTitle, [
    {
      title: '고객 문제와 핵심 사용자 정리하기',
      doneWhen: '타깃 사용자와 해결할 문제를 한 문장으로 설명할 수 있다',
      durationMin: 20,
      difficulty: 1,
      dayOffset: 0,
      dependsOn: [],
      starterStep: '노트에 가장 먼저 떠오르는 사용자 한 명과 불편 한 가지 적기',
    },
    {
      title: 'MVP 핵심 기능 목록 만들기',
      doneWhen: '꼭 필요한 기능 3개와 제외할 기능이 문서에 구분되어 있다',
      durationMin: 45,
      difficulty: 2,
      dayOffset: 1,
      dependsOn: ['1'],
      starterStep: '문제 해결에 반드시 필요한 기능을 세 줄로 적기',
    },
    {
      title: '사용자 흐름과 화면 스케치 만들기',
      doneWhen: '사용자가 시작부터 완료까지 이동하는 화면 흐름이 보인다',
      durationMin: 60,
      difficulty: 2,
      dayOffset: 2,
      dependsOn: ['2'],
      starterStep: '종이에 첫 화면과 완료 화면 두 장 그리기',
    },
    {
      title: 'Replit에서 프로젝트 만들기',
      doneWhen: '실행 가능한 프로젝트 링크와 기본 첫 화면이 있다',
      durationMin: 60,
      difficulty: 2,
      dayOffset: 3,
      dependsOn: ['3'],
      starterStep: '노트북을 열고 replit.com에 로그인하기',
    },
    {
      title: '핵심 기능 첫 버전 구현하기',
      doneWhen: '사용자 흐름의 가장 중요한 한 경로가 끝까지 동작한다',
      durationMin: 90,
      difficulty: 3,
      dayOffset: 4,
      dependsOn: ['4'],
      starterStep: '가장 중요한 버튼 하나의 동작부터 구현하기',
    },
    {
      title: '테스트 사용자로 사용성 점검하기',
      doneWhen: '테스트 사용자 2명이 흐름을 완료하고 막힌 지점이 기록되어 있다',
      durationMin: 60,
      difficulty: 3,
      dayOffset: 5,
      dependsOn: ['5'],
      starterStep: '친구 한 명에게 테스트 링크를 보내겠다고 메시지하기',
    },
    {
      title: '발표용 MVP 소개와 지표 준비하기',
      doneWhen: '문제·해결책·사용 결과를 3분 안에 보여줄 자료가 있다',
      durationMin: 75,
      difficulty: 3,
      dayOffset: 6,
      dependsOn: ['6'],
      starterStep: '발표에서 보여줄 핵심 장면 하나를 캡처하기',
    },
    {
      title: '창업 대회 제출물 최종 점검하기',
      doneWhen: '제출 링크와 설명 문서가 열리고 마감 전에 제출할 수 있다',
      durationMin: 45,
      difficulty: 2,
      dayOffset: 7,
      dependsOn: ['7'],
      starterStep: '제출 페이지와 마감 시간을 캘린더에 저장하기',
    },
  ]);

const examBreakdown = (goalTitle: string): BreakdownSubtask[] =>
  cloneBreakdown(goalTitle, [
    {
      title: '시험 범위와 목표 점수 확인하기',
      doneWhen: '시험 범위·문항·목표 점수가 한 장에 정리되어 있다',
      durationMin: 20,
      difficulty: 1,
      dayOffset: 0,
      dependsOn: [],
      starterStep: '시험 안내 페이지를 열고 날짜와 범위에 밑줄 긋기',
    },
    {
      title: '현재 실력 진단 테스트 풀기',
      doneWhen: '시간을 재고 진단 점수와 틀린 문제 수를 기록했다',
      durationMin: 60,
      difficulty: 2,
      dayOffset: 1,
      dependsOn: ['1'],
      starterStep: '진단용 문제지 첫 페이지를 펼치고 타이머 시작하기',
    },
    {
      title: '취약한 단원과 오답 유형 분류하기',
      doneWhen: '오답이 단원·실수 유형별로 분류되어 우선순위가 보인다',
      durationMin: 45,
      difficulty: 2,
      dayOffset: 2,
      dependsOn: ['2'],
      starterStep: '틀린 문제 세 개에 왜 틀렸는지 한 단어씩 적기',
    },
    {
      title: '핵심 개념과 단어 복습하기',
      doneWhen: '취약 단원의 핵심 개념과 단어를 가리고 설명할 수 있다',
      durationMin: 60,
      difficulty: 2,
      dayOffset: 3,
      dependsOn: ['3'],
      starterStep: '오늘 외울 핵심 단어 열 개를 골라 카드 만들기',
    },
    {
      title: '유형별 문제를 시간 재고 풀기',
      doneWhen: '취약 유형 문제를 정해진 시간 안에 풀고 채점했다',
      durationMin: 75,
      difficulty: 3,
      dayOffset: 4,
      dependsOn: ['4'],
      starterStep: '가장 약한 유형 문제 다섯 개부터 풀기',
    },
    {
      title: '오답 노트로 틀린 이유 설명하기',
      doneWhen: '오답마다 정답 근거와 다시 풀 규칙이 적혀 있다',
      durationMin: 45,
      difficulty: 2,
      dayOffset: 5,
      dependsOn: ['5'],
      starterStep: '오늘 틀린 문제 하나의 정답 근거를 소리 내어 설명하기',
    },
    {
      title: '실전 모의고사 한 회 완주하기',
      doneWhen: '실제 시험과 같은 시간으로 모의고사를 끝내고 점수를 기록했다',
      durationMin: 90,
      difficulty: 3,
      dayOffset: 6,
      dependsOn: ['6'],
      starterStep: '시험 시간과 같은 두 시간을 비워 모의고사 파일 열기',
    },
    {
      title: '시험 전 준비물과 전략 점검하기',
      doneWhen: '준비물·이동 시간·문제 풀이 순서가 체크리스트로 완료됐다',
      durationMin: 30,
      difficulty: 1,
      dayOffset: 7,
      dependsOn: ['7'],
      starterStep: '신분증과 필기구를 한 곳에 꺼내 두기',
    },
  ]);

const genericBreakdown = (goalTitle: string): BreakdownSubtask[] =>
  cloneBreakdown(goalTitle, [
    {
      title: `${goalTitle}의 결과 정리하기`,
      doneWhen: '목표를 달성했을 때 확인할 결과가 한 문장으로 적혀 있다',
      durationMin: 15,
      difficulty: 1,
      dayOffset: 0,
      dependsOn: [],
      starterStep: '목표가 끝났다고 판단할 수 있는 장면 하나 적기',
    },
    {
      title: `${goalTitle}에 필요한 준비물 모으기`,
      doneWhen: '시작에 필요한 자료와 도구가 한 곳에 준비되어 있다',
      durationMin: 30,
      difficulty: 1,
      dayOffset: 1,
      dependsOn: ['1'],
      starterStep: '필요한 준비물 세 가지를 체크리스트에 적기',
    },
    {
      title: `${goalTitle}의 첫 단계 실행하기`,
      doneWhen: '목표를 향한 첫 번째 작은 행동의 결과물이 남아 있다',
      durationMin: 45,
      difficulty: 2,
      dayOffset: 2,
      dependsOn: ['2'],
      starterStep: '준비한 도구로 10분만 첫 행동 시작하기',
    },
    {
      title: `${goalTitle}의 핵심 작업 진행하기`,
      doneWhen: '목표 결과물의 절반 이상이 만들어져 있다',
      durationMin: 60,
      difficulty: 3,
      dayOffset: 3,
      dependsOn: ['3'],
      starterStep: '가장 중요한 작업 한 덩어리를 25분 동안 진행하기',
    },
    {
      title: `${goalTitle}의 결과 다듬기`,
      doneWhen: '빠진 부분과 어색한 부분이 수정된 결과물이 있다',
      durationMin: 45,
      difficulty: 2,
      dayOffset: 4,
      dependsOn: ['4'],
      starterStep: '결과물을 처음부터 한 번 읽으며 고칠 곳 표시하기',
    },
    {
      title: `${goalTitle}의 완료 여부 점검하기`,
      doneWhen: '완료 조건을 모두 체크했고 다음 행동이 필요 없는 상태다',
      durationMin: 30,
      difficulty: 1,
      dayOffset: 5,
      dependsOn: ['5'],
      starterStep: '완료 조건을 소리 내어 하나씩 확인하기',
    },
  ]);

function normalizeGoalTitle(goal: string): string {
  return normalize(goal)
    .replace(/(?:오늘|내일|모레|이번\s*주|다음\s*주|이번주|다음주)\s*/g, '')
    .replace(/(?:오전|오후)\s*\d{1,2}시(?:\s*\d{1,2}분?)?/g, '')
    .replace(/\d{1,2}:\d{2}/g, '')
    .replace(/까지/g, '')
    .replace(/[은는이가을를엔에,\s]+$/g, '')
    .trim() || '새 목표';
}

function validDeadline(deadline: string | null, today: string): string {
  if (deadline && /^\d{4}-\d{2}-\d{2}$/.test(deadline) && deadline >= today) {
    return deadline;
  }
  return addDaysToDateString(today, 14);
}

function breakdownForGoal(goal: string): {
  goalTitle: string;
  subtasks: BreakdownSubtask[];
  assumption: string | null;
} {
  if (/MVP|앱|개발|창업/i.test(goal)) {
    const goalTitle = '창업 대회 MVP 개발';
    return { goalTitle, subtasks: mvpBreakdown(goalTitle), assumption: null };
  }
  if (/토익|시험|자격증|공부/.test(goal)) {
    const goalTitle = '시험 준비';
    return { goalTitle, subtasks: examBreakdown(goalTitle), assumption: null };
  }
  const goalTitle = normalizeGoalTitle(goal);
  return {
    goalTitle,
    subtasks: genericBreakdown(goalTitle),
    assumption: '일반적인 순서로 나눴어요. 탭해서 고칠 수 있어요',
  };
}

function resplitBreakdown(title: string, current: Date): BreakdownResult {
  const today = formatDateInSeoul(current);
  const subtasks = cloneBreakdown(title, [
    {
      title: `${title} 준비하기`,
      doneWhen: '실행에 필요한 자료와 환경이 준비되어 있다',
      durationMin: 20,
      difficulty: 1,
      dayOffset: 0,
      dependsOn: [],
      starterStep: '필요한 자료 하나를 꺼내 눈앞에 놓기',
    },
    {
      title: `${title} 실행하기`,
      doneWhen: '정한 범위의 작업 결과물이 실제로 만들어져 있다',
      durationMin: 45,
      difficulty: 2,
      dayOffset: 0,
      dependsOn: ['1'],
      starterStep: '타이머를 10분으로 맞추고 첫 동작 시작하기',
    },
    {
      title: `${title} 점검하기`,
      doneWhen: '완료 조건을 확인하고 고칠 부분이 반영되어 있다',
      durationMin: 20,
      difficulty: 1,
      dayOffset: 1,
      dependsOn: ['2'],
      starterStep: '완료 조건을 다시 읽고 빠진 부분에 동그라미 치기',
    },
  ]);
  return {
    goalTitle: title,
    deadline: addDaysToDateString(today, 14),
    assumption: null,
    subtasks,
  };
}

export class MockAIProvider implements AIProvider {
  async parse(text: string, current: Date): Promise<ParseResult> {
    const value = normalize(text);
    const today = formatDateInSeoul(current);
    const demo = demoItems(value, today);
    if (demo) return demo;

    const chunks = value
      .split(/[,，]|\s+그리고\s+|\s+하고\s+/)
      .map((chunk) => chunk.trim())
      .filter(Boolean);
    return {
      items: (chunks.length ? chunks : [value]).map((chunk) => makeItem(chunk, today)),
    };
  }

  async breakdown(goal: string, deadline: string | null, current: Date): Promise<BreakdownResult> {
    await new Promise((resolve) => setTimeout(resolve, 1200 + Math.floor(Math.random() * 601)));
    const today = formatDateInSeoul(current);
    const selected = breakdownForGoal(goal);
    return {
      goalTitle: selected.goalTitle,
      deadline: validDeadline(deadline, today),
      assumption: selected.assumption,
      subtasks: selected.subtasks,
    };
  }

  async resplit(title: string, current: Date): Promise<BreakdownResult> {
    await new Promise((resolve) => setTimeout(resolve, 900 + Math.floor(Math.random() * 401)));
    return resplitBreakdown(title, current);
  }
}

export const mockAIProvider = new MockAIProvider();