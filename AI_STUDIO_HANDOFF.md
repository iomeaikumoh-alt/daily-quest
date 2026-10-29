# Google AI Studio 작업 인수인계 문서

## 프로젝트

**나의 일일퀘스트** — 가족과 함께 일상 목표를 퀘스트로 관리하는 Expo 모바일 앱입니다.

현재 작업 기준일은 2026-09-21이며, 앱 화면의 날짜 계산은 서울 시간대(`Asia/Seoul`)를 기준으로 합니다.

## 현재 구현된 핵심 기능

- 오늘의 퀘스트와 목표를 RPG 스타일 홈 화면에서 관리
- 목표를 날짜별 퀘스트로 분리해 표시
- 홈에서 이전 날짜, 오늘, 다음 날짜 및 이후 예정 날짜를 넘겨서 확인
- 선택 날짜가 오늘이 아닐 때 퀘스트 조회와 삭제만 허용
- 다른 날짜 퀘스트의 완료, EXP, 코인, 스트릭 보상 차단
- 스트릭, 부활 미션, HeroSlot 추천 퀘스트, 행동 패턴 기반 추천 유지
- 건강 데이터 기반 자동 완료 시뮬레이션
- 목표 입력 및 AI 기반 목표/하위 퀘스트 생성 흐름
- 가족 파티 화면, 공유 설정, 던전/상점/프로필 화면
- API 서버와 공유 TypeScript 라이브러리 구조

## 소스 위치

- `artifacts/daily-quest-mobile/`
  - Expo Router 모바일 앱
  - `app/index.tsx`: 홈 화면, 날짜 페이저, 퀘스트 카드, HeroSlot
  - `store/useDailyQuestStore.ts`: 목표·퀘스트·보상·스트릭 상태
  - `components/QuickCapture.tsx`: 자연어 목표 입력 및 하위 퀘스트 생성
- `artifacts/api-server/`
  - Express API 서버
  - `src/routes/parse.ts`: 목표/퀘스트 파싱 API
- `lib/`
  - `clock.ts`: 서울 시간 기준 날짜 유틸리티
  - `scheduler.ts`: 목표를 날짜별 퀘스트로 확장
  - `ai/`: AI 제공자, 목표 분해, 행동 패턴 분석
  - `health/HealthAdapter.ts`: 건강 데이터 어댑터
  - `api-*`, `db/`: 공유 API 계약, Zod 타입, DB 패키지
- `screenshots/`
  - 주요 모바일 화면 캡처
- `attached_assets/`
  - 초기 요구사항과 UI 참고 자료

## 날짜 분리 동작의 기준

홈 목록은 퀘스트 ID나 목표 ID가 아니라 `quest.scheduledDate`와 현재 선택 날짜가 정확히 일치하는지로 결정합니다.

- 예: 2026-09-30에 배정된 퀘스트는 2026-09-21 홈에 표시되지 않음
- 선택 날짜가 오늘과 다르면 완료 콜백을 비활성화
- 저장소의 `completeQuest`에도 현재 실제 날짜가 아니면 완료를 거부하는 방어 로직이 필요하며, 현재 구현되어 있음
- `pattern-history` 퀘스트는 행동 패턴 계산용이므로 홈 날짜 목록에서 제외

## 개발 환경

```text
Node.js 24
pnpm workspaces
TypeScript
Expo SDK 57
React Native 0.86
Expo Router
Express 5
Zustand
```

설치 후 주요 확인 명령:

```bash
pnpm install
pnpm --filter @workspace/daily-quest-mobile run typecheck
pnpm -w run typecheck:libs
pnpm --filter @workspace/daily-quest-mobile exec expo export --platform web
```

## Google AI Studio에서 이어서 작업할 때의 요청 예시

```text
이 ZIP을 먼저 전체적으로 분석해줘. AI_STUDIO_HANDOFF.md의 제품 요구사항과 날짜 분리 규칙을 기준으로 이해하고,
기존 Expo 앱 구조를 유지하면서 내가 요청하는 기능만 수정해줘.
특히 scheduledDate 기준의 홈 필터와 다른 날짜 퀘스트 완료 차단을 깨뜨리지 말고,
수정 후 TypeScript 검사와 Expo web export까지 확인해줘.
```

## 보안 및 전달 범위

이 패키지에는 `node_modules`, 빌드 산출물, `.expo` 캐시, Git 기록, 환경변수 파일, API 키와 비밀값을 포함하지 않았습니다.

API나 데이터베이스를 이어서 작업하려면 Google AI Studio에서 필요한 환경변수를 별도로 설정해야 합니다. 비밀값은 이 ZIP에 추가하지 마세요.