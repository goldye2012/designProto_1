# PowerToggle

LED 전원 스위치. 컨트롤 카드 아래쪽 행 (위 행과 `--line` 1px 구분선, padding-top space-4).

- 행 구성: 왼쪽 [제목 "LED 전원" `t-heading` + 아래 "켜짐/꺼짐" `t-caption` `--ink-muted`], 오른쪽 스위치
- 스위치: `<button role="switch" aria-checked aria-label="LED 전원">`
  - 트랙 52×32 `--radius-full`, OFF `--led-off` / ON `--brand`
  - 손잡이 24×24, 4px 안쪽, OFF `--surface-raised` / ON `--on-brand`, ON일 때 오른쪽으로 20px 이동, 150ms
  - 터치 영역 최소 44px
- 누르면 즉시 UI 반영 → `setLedPower(on)` → 실패하면 이전 상태로 되돌리고 행 아래에 "전원 변경 실패 — 다시 시도" `t-caption` `--danger`
- 앱 시작 시 `loadPower()`로 초기값
- 센서 연결 여부와 무관하게 동작
