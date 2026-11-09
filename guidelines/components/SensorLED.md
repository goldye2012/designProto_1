# SensorLED

센서값에 따라 밝기·글로우가 바뀌는 화면 속 LED. 실제 조명의 디지털 쌍둥이. 카드 "조명 상태".

- 카드 헤더: "조명 상태" `t-heading` / 오른쪽 범위 `0–4095` `t-caption` `--ink-muted`
- level = clamp((value − SENSOR_MIN) / (SENSOR_MAX − SENSOR_MIN), 0, 1)
- 원 160×160 `--radius-full`, 가운데 정렬. 두 겹:
  - 바닥 원: `--led-low`
  - 위 원: `--led-high`, opacity = level, box-shadow `0 0 (level×64)px (level×16)px var(--led-high)`, 200ms 전환
- 전원 OFF: 바닥 원 `--led-off`, 위 원 숨김
- 원 아래 space-6 간격으로 현재값 `t-value` (천 단위 콤마, 값 없으면 "—")
- `role="img"`, `aria-label="LED 밝기 NN%"` / 꺼지면 "LED 꺼짐"
- 응용: 원 대신 제품 실루엣 SVG, 값 구간별 색 변화
