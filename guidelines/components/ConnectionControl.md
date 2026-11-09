# ConnectionControl

센서(Supabase realtime) 연결/끊기 버튼 + 상태 표시. PowerToggle과 같은 "컨트롤" 카드 안 위쪽 행.

- 행 구성: 왼쪽 [제목 "센서" `t-heading` + 상태], 오른쪽 버튼
- 상태 4개와 문구:
  - disconnected → "연결 안 됨" (`--ink-muted`, 점 `--led-off`)
  - connecting → "연결 중…" (`--ink-muted`, 점 `--brand`)
  - connected → "연결됨" (`--status-on`, 점 `--status-on`)
  - error → "연결 실패 — 다시 시도" (`--danger`, 점 `--danger`)
  - 점은 8×8 `--radius-full`, 점–글자 간격 space-2, `t-label`, `role="status"`
- 버튼: 연결 전 primary "센서 연결" (`--brand` 배경, `--on-brand` 글자) / 연결 후 secondary "연결 끊기" (투명 배경, `--line` 1px 테두리, `--ink` 글자)
  - min-height 44px, 패딩 space-3 space-4, `--radius-md`, `t-label`
  - connecting 중 disabled (opacity .5)
- 연결 끊으면 차트·LED는 마지막 값을 유지한 채 멈춘다
