# AppShell

전체 화면 레이아웃 + 상태 관리 (`App.tsx`).

## 레이아웃
- `<main>` 최대 폭 1120px 가운데. 여백 모바일 space-4 / 웹(≥768px) 위아래 space-12, 좌우 space-8
- grid: 모바일 1열 gap space-4 / 웹 2열 gap space-6
- 순서와 배치:
  1. ProductHeader — 전체 폭
  2. "조명 상태" 카드(SensorLED) — 웹 왼쪽
  3. "컨트롤" 카드(ConnectionControl + PowerToggle) — 웹 오른쪽
  4. SensorChart 카드 — 전체 폭
- viewport meta: `width=device-width, initial-scale=1`

## 상태
```ts
const [status, setStatus] = useState<Status>('disconnected');
const [power, setPower] = useState(false);
const [readings, setReadings] = useState<Reading[]>([]);
```
- connected 여부는 `status === 'connected'`
- 최신값 = `readings.at(-1)?.value`
- `onReading`: 배열 끝에 추가, MAX_POINTS 초과 시 앞에서 제거
- 언마운트 시 `disconnectSensor()`

## 응용
- 카드 추가: grid 안에 `.card` 추가. 전체 폭은 `col-span-full`.
