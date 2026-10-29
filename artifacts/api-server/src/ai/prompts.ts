import {
  addDaysToDateString,
  formatDateInSeoul,
  weekdayForDateString,
} from "../../../../lib/clock";
import type { ClaudeTool } from "./claude-client";

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

/**
 * LLMs are unreliable at calendar arithmetic, so every prompt carries an
 * explicit two-week calendar anchored to today in Asia/Seoul.
 */
export function buildDateContext(current: Date): string {
  const today = formatDateInSeoul(current);
  const hour = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(current);
  const rows: string[] = [];
  for (let offset = 0; offset < 21; offset += 1) {
    const date = addDaysToDateString(today, offset);
    const weekday = weekdayForDateString(date);
    const tag = offset === 0 ? " (오늘)" : offset === 1 ? " (내일)" : offset === 2 ? " (모레)" : "";
    rows.push(`- ${date} ${WEEKDAY_LABELS[weekday]}요일 weekday=${weekday}${tag}`);
  }
  return [
    `현재 시각(Asia/Seoul): ${today} ${hour}`,
    "이번 주는 월요일에 시작합니다. '다음 주'는 다음 월요일부터의 주를 뜻합니다.",
    "날짜 계산은 반드시 아래 달력에서 고르세요:",
    ...rows,
  ].join("\n");
}

const nullableString = { type: ["string", "null"] };

export const PARSE_TOOL: ClaudeTool = {
  name: "record_quest_items",
  description: "사용자의 자연어 일정 문장을 퀘스트 항목 목록으로 기록합니다.",
  input_schema: {
    type: "object",
    properties: {
      items: {
        type: "array",
        minItems: 1,
        maxItems: 10,
        items: {
          type: "object",
          properties: {
            kind: { type: "string", enum: ["task", "bigGoal"] },
            title: { type: "string", description: "날짜·시간·장소 표현을 뺀 짧은 할 일 이름 (최대 30자)" },
            date: { ...nullableString, description: "YYYY-MM-DD" },
            startTime: { ...nullableString, description: "24시간 HH:MM" },
            durationMin: { type: "integer", minimum: 5, maximum: 480 },
            location: nullableString,
            note: nullableString,
            difficulty: { type: "integer", minimum: 1, maximum: 5 },
            recurrence: {
              type: "object",
              properties: {
                freq: { type: "string", enum: ["none", "daily", "weekly"] },
                byWeekday: {
                  type: "array",
                  items: { type: "integer", minimum: 0, maximum: 6 },
                },
                until: { ...nullableString, description: "YYYY-MM-DD 또는 null" },
              },
              required: ["freq", "byWeekday", "until"],
            },
            uncertain: {
              type: "array",
              items: { type: "string", enum: ["date", "startTime", "durationMin", "location"] },
            },
          },
          required: [
            "kind",
            "title",
            "date",
            "startTime",
            "durationMin",
            "location",
            "note",
            "difficulty",
            "recurrence",
            "uncertain",
          ],
        },
      },
    },
    required: ["items"],
  },
};

export const PARSE_SYSTEM = `당신은 한국어 일정 비서입니다. 사용자의 한 문장을 '나의 일일퀘스트' 앱의 퀘스트 항목으로 바꿔 record_quest_items 도구로만 답합니다.

규칙:
- 한 문장에 여러 할 일이 있으면 항목을 나눕니다 (쉼표, '그리고', '하고', 시간대 나열 등).
- kind: 마감이 있거나 여러 날에 걸쳐 달성하는 목표("~까지 합격", "한 달 안에 완성", "3주 안에 5kg")는 "bigGoal", 한 번 또는 반복해서 하는 행동은 "task".
- title: 행동만 남긴 짧은 이름. 날짜·시간·장소·반복 표현은 title에서 뺍니다. 예: "내일 아침 9시 도서관에서 토익 LC 1시간" → "토익 LC".
- bigGoal의 date는 마감일입니다. "한 달 안에"→오늘+30일, "3주 안에"→오늘+21일, "11월 말까지"→11월 마지막 날처럼 계산합니다. 마감 표현이 없으면 오늘을 쓰고 uncertain에 "date"를 넣습니다.
- date: 달력에서 고른 YYYY-MM-DD. 달력 밖의 날짜는 YYYY-MM-DD로 직접 계산합니다. 날짜 언급이 없으면 오늘을 쓰고 uncertain에 "date"를 넣습니다. 과거 날짜는 오늘로 바꾸고 uncertain에 "date"를 넣습니다.
- startTime: 24시간 HH:MM. "오후 3시"→"15:00". 시각이 없으면 null. "아침/점심/오후/저녁/밤"처럼 대략적인 때만 있으면 각각 09:00/12:00/15:00/19:00/22:00으로 쓰고 uncertain에 "startTime"을 넣습니다.
- durationMin: 분 단위 정수. 언급이 없으면 30을 쓰고 uncertain에 "durationMin"을 넣습니다.
- location: "~에서" 같은 장소가 있으면 장소 이름, 없으면 null.
- note: 제목에 담지 못한 중요한 조건이 있을 때만 한 줄, 없으면 null.
- difficulty: 1(아주 쉬움)~5(아주 어려움). 30분 이하 가벼운 일은 1~2, 60분 이상이나 집중이 필요한 일은 3 이상.
- recurrence: "매일"→freq "daily". "매주 화목"→freq "weekly", byWeekday [2,4] (0=일요일 ... 6=토요일). 반복이 없으면 freq "none", byWeekday [], until null. 종료일 언급이 있을 때만 until을 씁니다.
- uncertain에는 추측해서 채운 필드 이름만 넣습니다.
- 문장에 없는 할 일을 지어내지 않습니다.`;

const subtaskSchema = {
  type: "object",
  properties: {
    id: { type: "string", description: "\"1\"부터 시작하는 순번 문자열" },
    title: { type: "string", description: "동사로 끝나는 구체적인 행동 (최대 30자)" },
    doneWhen: { type: "string", description: "눈으로 확인 가능한 완료 조건 한 문장" },
    durationMin: { type: "integer", minimum: 5, maximum: 120 },
    difficulty: { type: "integer", minimum: 1, maximum: 5 },
    dayOffset: { type: "integer", minimum: 0, description: "오늘=0 기준 며칠 뒤에 할지" },
    dependsOn: { type: "array", items: { type: "string" }, description: "먼저 끝나야 하는 하위 퀘스트 id" },
    starterStep: { type: "string", description: "2분 안에 시작할 수 있는 첫 동작" },
  },
  required: ["id", "title", "doneWhen", "durationMin", "difficulty", "dayOffset", "dependsOn", "starterStep"],
};

export const BREAKDOWN_TOOL: ClaudeTool = {
  name: "record_goal_breakdown",
  description: "큰 목표를 날짜별로 실행할 수 있는 하위 퀘스트로 나눈 결과를 기록합니다.",
  input_schema: {
    type: "object",
    properties: {
      goalTitle: { type: "string", description: "목표를 요약한 짧은 이름 (최대 30자)" },
      deadline: { type: "string", description: "YYYY-MM-DD" },
      assumption: { ...nullableString, description: "정보가 부족해 가정한 내용이 있으면 한 문장, 없으면 null" },
      subtasks: { type: "array", minItems: 3, maxItems: 10, items: subtaskSchema },
    },
    required: ["goalTitle", "deadline", "assumption", "subtasks"],
  },
};

export const BREAKDOWN_SYSTEM = `당신은 목표를 실행 가능한 하루 단위 퀘스트로 쪼개는 코치입니다. 결과는 record_goal_breakdown 도구로만 답합니다.

규칙:
- 하위 퀘스트는 3~10개. 순서대로 따라 하면 목표가 끝나도록 구성합니다.
- 첫 번째 퀘스트는 오늘(dayOffset 0) 30분 이내로 끝낼 수 있는 가장 쉬운 일(difficulty 1~2)로 시작합니다. 시작 장벽을 낮추는 것이 핵심입니다.
- 각 퀘스트는 120분 이하이고, 같은 날(dayOffset)에 배정된 퀘스트의 합계도 120분을 넘지 않게 합니다.
- dayOffset은 마감일 이전에 끝나도록 배정하고, 마감 직전 하루는 점검용으로 비워두는 편이 좋습니다.
- doneWhen은 다른 사람이 봐도 완료 여부를 판단할 수 있는 결과물이나 상태로 씁니다 ("열심히 하기" 같은 표현 금지).
- starterStep은 지금 바로 2분 안에 할 수 있는 몸의 첫 동작입니다 (예: "노트북을 열고 문서 새로 만들기").
- dependsOn에는 먼저 끝나야 하는 퀘스트의 id만 넣습니다. 첫 퀘스트는 [].
- 마감일이 주어지지 않았으면 목표 규모에 맞게 오늘부터 7~28일 사이로 정하고, assumption에 그 가정을 한 문장으로 적습니다.
- 의료적 판단이 필요한 목표(약 복용량 변경, 급격한 체중 감량 등)는 무리한 계획 대신 안전한 생활 습관 단위로 나누고, 필요하면 전문가 상담을 첫 퀘스트로 둡니다.`;

export const RESPLIT_TOOL: ClaudeTool = {
  ...BREAKDOWN_TOOL,
  name: "record_task_resplit",
  description: "하나의 퀘스트를 더 작은 퀘스트로 나눈 결과를 기록합니다.",
  input_schema: {
    ...BREAKDOWN_TOOL.input_schema,
    properties: {
      ...(BREAKDOWN_TOOL.input_schema["properties"] as Record<string, unknown>),
      subtasks: { type: "array", minItems: 2, maxItems: 4, items: subtaskSchema },
    },
  },
};

export const RESPLIT_SYSTEM = `당신은 너무 크게 느껴지는 퀘스트 하나를 더 작은 단계로 나누는 코치입니다. 결과는 record_task_resplit 도구로만 답합니다.

규칙:
- 하위 퀘스트는 2~4개이며, 합치면 원래 퀘스트가 끝납니다.
- 각 단계는 5~45분, dayOffset은 0 또는 1만 씁니다.
- 첫 단계는 5~15분짜리 준비 동작(difficulty 1)으로 시작합니다.
- goalTitle은 원래 퀘스트 제목을 그대로 씁니다. deadline은 오늘로부터 14일 뒤 날짜, assumption은 null로 둡니다.
- doneWhen과 starterStep 작성 규칙은 목표 분해와 같습니다: 확인 가능한 완료 조건, 2분 안에 할 수 있는 첫 동작.`;

export function buildParseUserMessage(text: string, current: Date): string {
  return `${buildDateContext(current)}\n\n사용자 입력:\n"""${text}"""`;
}

export function buildBreakdownUserMessage(goal: string, deadline: string | null, current: Date): string {
  const deadlineLine = deadline ? `마감일: ${deadline}` : "마감일: 주어지지 않음";
  return `${buildDateContext(current)}\n\n목표:\n"""${goal}"""\n${deadlineLine}`;
}

export function buildResplitUserMessage(title: string, current: Date): string {
  return `${buildDateContext(current)}\n\n나눌 퀘스트:\n"""${title}"""`;
}
