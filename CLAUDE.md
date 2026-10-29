# 나의 일일퀘스트 — Claude Code 작업 지침

## 제품 개요

한국어 사용자를 위한 Expo 기반 일일 퀘스트 앱입니다. 목표를 날짜별 퀘스트로 나누고, RPG 방식의 경험치·레벨·스트릭과 가족 파티 기능을 제공합니다.

## 작업 전 지켜야 할 제품 규칙

- 홈의 퀘스트 목록은 선택한 홈 날짜와 `quest.scheduledDate`가 정확히 같은 퀘스트만 보여줍니다.
- 날짜 비교는 서울 시간대(`Asia/Seoul`) 기준 유틸리티를 사용합니다.
- 오늘이 아닌 날짜의 퀘스트는 확인과 삭제만 가능합니다. 완료, 경험치, 코인, 스트릭 보상을 허용하지 않습니다.
- 완료 제한은 화면에서 막는 것에 그치지 말고 저장소의 완료 처리에서도 검증합니다.
- `pattern-history`는 행동 패턴 계산용 기록이며 사용자 홈 퀘스트로 노출하지 않습니다.
- HeroSlot, 스트릭·부활, 행동 패턴 추천, 파티 및 기존 화면 흐름을 요청 없이 제거하거나 대체하지 않습니다.
- 날짜별 퀘스트 생성/표시는 목표 ID에 대한 예외 처리 대신 실제 예약 날짜를 기준으로 유지합니다.

## 주요 폴더

- `artifacts/daily-quest-mobile/`: Expo Router 모바일 앱
- `artifacts/daily-quest-mobile/app/index.tsx`: 홈, 날짜 이동, 퀘스트 카드와 주요 앱 화면
- `artifacts/daily-quest-mobile/store/useDailyQuestStore.ts`: 목표·퀘스트 상태, 완료 및 보상 처리
- `artifacts/daily-quest-mobile/components/QuickCapture.tsx`: 자연어 목표 입력
- `artifacts/api-server/`: Express API 서버
- `lib/clock.ts`: 서울 시간대 날짜 유틸리티
- `lib/scheduler.ts`: 목표를 날짜별 퀘스트로 변환
- `lib/ai/`: 파싱, 퀘스트 분해, 행동 패턴 분석
- `lib/health/`: 건강 데이터 어댑터
- `artifacts/api-server/src/ai/`: 서버 전용 Claude 연동 (프롬프트, 출력 정리·검증, Mock 폴백)

## AI 연동

- 앱은 `/api/parse`, `/api/breakdown`, `/api/resplit`을 호출하고, 실패하면 기기 안의 `mockAIProvider`로 대체합니다.
- 서버는 `ANTHROPIC_API_KEY`가 있으면 Claude(기본 `claude-haiku-5-5`)를 쓰고, 없거나 호출·검증에 실패하면 규칙 기반 Mock으로 응답합니다. 응답의 `source`(`claude`/`mock`)와 `fallbackReason`으로 확인합니다.
- API 키와 프롬프트는 서버에만 둡니다. 모바일 번들에서 `artifacts/api-server/src/ai/`를 import하지 않습니다.
- 환경변수 목록은 `.env.example`에 있습니다. AI 라우트는 IP당 분당 `AI_RATE_LIMIT_PER_MIN`(기본 20)회로 제한됩니다.
- API 계약을 바꾸면 `lib/api-spec/openapi.yaml`을 고친 뒤 `pnpm --filter @workspace/api-spec run codegen`을 실행합니다.

## 기술 스택과 확인 명령

프로젝트는 pnpm workspace이며 Expo/React Native, TypeScript, Zustand 및 Express를 사용합니다.

```bash
pnpm install
pnpm --filter @workspace/daily-quest-mobile run typecheck
pnpm -w run typecheck:libs
pnpm --filter @workspace/daily-quest-mobile exec expo export --platform web
```

수정 후 변경 범위에 맞는 검사 명령을 실행하고, 결과와 미검증 항목을 사용자에게 알려주세요.

## 보안과 변경 범위

- `.env`, 비밀값, 인증 토큰은 만들거나 커밋하지 않습니다.
- 앱 구조를 크게 바꾸거나 라이브러리를 교체하지 말고 기존 workspace 구조를 유지합니다.
- 사용자가 요청한 기능만 변경하고, 기존 앱 동작을 보존합니다.
