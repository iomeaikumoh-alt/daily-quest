# Claude Code에서 이어서 작업하기

이 패키지는 Claude.ai 채팅에 ZIP 파일을 첨부하는 대신, **Claude Code가 프로젝트 파일을 직접 읽고 수정하는 방식**으로 이어서 작업할 수 있게 준비했습니다.

## 시작 방법

1. `daily-quest-claude-code.zip`을 컴퓨터에 내려받아 압축을 풉니다.
2. 압축을 푼 `daily-quest-claude-code` 프로젝트 폴더를 터미널 또는 VS Code에서 엽니다.
3. Claude Code를 실행합니다.
4. 아래 요청을 입력해 프로젝트를 먼저 읽게 한 다음, 원하는 추가 작업을 요청합니다.

```text
먼저 저장소의 CLAUDE.md와 AI_STUDIO_HANDOFF.md를 읽고 앱 구조와 제품 규칙을 파악해줘.
현재 구조를 유지하면서 내가 요청한 내용만 구현하고, 날짜별 퀘스트 분리와 다른 날짜 완료 차단 규칙을 깨뜨리지 마.
변경 후 가능한 타입 검사와 Expo web export를 실행하고 결과를 요약해줘.
```

## 실행과 검사

프로젝트 루트에서:

```bash
pnpm install
pnpm --filter @workspace/daily-quest-mobile run typecheck
pnpm -w run typecheck:libs
pnpm --filter @workspace/daily-quest-mobile exec expo export --platform web
```

패키지에 `CLAUDE.md`가 포함되어 있어 Claude Code가 작업할 때 제품 규칙과 프로젝트 구조를 참고할 수 있습니다.

## 주의

이 코드는 Expo 모바일 앱과 API 서버를 포함합니다. Claude Code는 소스 파일을 수정할 수 있지만, 실행 환경과 API/데이터베이스 비밀값은 별도로 설정해야 할 수 있습니다. ZIP에는 의존성 폴더, 빌드 결과물, 캐시, Git 기록, 환경변수와 비밀값을 넣지 않았습니다.
