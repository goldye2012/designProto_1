# IoT 조명 웹앱 — 기본 프레임 가이드

센서값에 반응하는 조명 제품의 웹/스마트폰 화면이다. 데이터 흐름: 센서 → ESP32 → Supabase → 이 웹앱.
이 문서 하나에 모든 규칙이 있다.

- 아래 Setup, Tokens, styles, 컴포넌트 섹션을 모두 따른다.

## 반드시 지킬 규칙 (우선순위 높음)

1. 색·크기·간격은 `tokens.md`의 CSS 변수만 쓴다. Tailwind 기본 팔레트(blue-500 등)나 임의 hex 금지.
2. 글꼴은 `--font-sans` / `--font-display`. **letter-spacing을 절대 지정하지 않는다** (tracking-* 클래스 금지, 음수 포함). 영문 대문자 라벨(uppercase) 금지.
3. 상태(연결됨/오류/켜짐/꺼짐)는 항상 **글자로** 표시한다. 색만으로 구분 금지.
4. 버튼·토글 터치 영역 최소 44px. 스마트폰(375px)에서 가로 스크롤이 생기면 안 된다.
5. 화면은 `state` 하나(`connected`, `power`, `readings`)에서 그린다. 이벤트 → 상태 변경 → 다시 렌더.
6. Supabase 키는 anon(publishable) 키만. service_role 키는 코드에 넣지 않는다.
7. 라이트/다크 테마 둘 다 지원 (`prefers-color-scheme`). 텍스트 대비 4.5:1 이상.
8. 장식 금지: 그라데이션 배경, 이모지, 왼쪽 컬러 보더 카드, 의미 없는 통계 카드.

## 제품 슬롯 — 학생이 채우는 칸

아래 값은 `src/product.ts`의 `PRODUCT` 객체 한 곳에서만 정의하고, 화면은 거기서 읽는다.
비어 있으면 `[제품 이름]` 같은 자리표시를 점선 밑줄로 보여준다.

| 슬롯 | 위치 |
| --- | --- |
| 제품 이름 | `PRODUCT.name` |
| 제품 컨셉 (한 줄) | `PRODUCT.concept` |
| 제품 설명 (2~3문장) | `PRODUCT.description` |
| 메인 컬러 | `styles.md`의 `--brand` (라이트/다크 각각) + `--on-brand` |
| 폰트 | `styles.md`의 `--font-sans`, `--font-display` |

## 기능

| 기능 | 컴포넌트 | 데이터 |
| --- | --- | --- |
| 센서값에 따라 바뀌는 LED | SensorLED | 최신 `sensor_readings.value` |
| 센서값 플롯 | SensorChart | 최근 60개 + realtime INSERT |
| LED 전원 on/off | PowerToggle | `device_state.led_on` 업데이트 |
| 센서 연결 / 끊기 | ConnectionControl | realtime 채널 구독 / 해제 |
| 반응형 | AppShell | 768px 기준 1열 ↔ 2열 |
| 제품 정보 | ProductHeader | `PRODUCT` |

"센서 연결"은 블루투스/시리얼이 아니라 Supabase realtime 채널 **구독**이다. 그래서 iOS 포함 모든 스마트폰에서 동작한다.

## 응용 범위

- 바꿔도 됨: 제품 슬롯, LED 모양(원 → 제품 실루엣 SVG), 센서 범위·단위, 차트 포인트 수, 카드 추가.
- 바꾸면 안 됨: 위 "반드시 지킬 규칙" 8개, `state` 구조, Supabase 테이블 이름·컬럼.


---

## Setup

### 스택
- React + TypeScript + Tailwind (Make 기본). 추가 UI 라이브러리(shadcn 컴포넌트 등)는 쓰지 않고 `components/*.md` 대로 직접 만든다.
- `@supabase/supabase-js` v2. 차트는 라이브러리 없이 SVG로 그린다.

### 파일 구조
```
src/
  product.ts        // PRODUCT 슬롯 + DEVICE_ID + SENSOR_MIN/MAX
  lib/supabase.ts   // createClient
  lib/device.ts     // connectSensor, disconnectSensor, setLedPower, loadPower
  components/       // ProductHeader, ConnectionControl, PowerToggle, SensorLED, SensorChart
  App.tsx           // AppShell + state
styles/globals.css  // styles.md 내용
```

### product.ts
```ts
export const PRODUCT = { name: '', concept: '', description: '' };
export const DEVICE_ID = 'lamp-01';
export const SENSOR_MIN = 0;
export const SENSOR_MAX = 4095; // ESP32 ADC 12bit
export const MAX_POINTS = 60;
```

### Supabase
URL과 anon 키는 `lib/supabase.ts` 상단 상수로 둔다 (수업용). 학생이 자기 프로젝트 값으로 교체.

```ts
import { createClient } from '@supabase/supabase-js';
export const SUPABASE_URL = 'https://<project>.supabase.co';
export const SUPABASE_ANON_KEY = '<anon key>';
export const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

### 테이블 (변경 금지 — ESP32 코드와 공유)
```sql
create table sensor_readings (
  id bigint generated always as identity primary key,
  device_id text not null,
  value int not null,
  created_at timestamptz not null default now()
);
create table device_state (
  device_id text primary key,
  led_on boolean not null default false,
  updated_at timestamptz not null default now()
);
alter publication supabase_realtime add table sensor_readings;
```

### lib/device.ts — 이 시그니처를 유지
```ts
type Reading = { value: number; created_at: string };
type Status = 'disconnected' | 'connecting' | 'connected' | 'error';

// 최근 MAX_POINTS개 select(오래된 순으로 정렬해 반환) → onInit
// 그 뒤 sensor_readings INSERT (filter: device_id=eq.DEVICE_ID) 구독 → onReading
// 구독 상태 SUBSCRIBED → 'connected', CHANNEL_ERROR/TIMED_OUT → 'error'
connectSensor(opts: {
  onInit: (rows: Reading[]) => void;
  onReading: (row: Reading) => void;
  onStatus: (s: Status) => void;
}): Promise<void>;

disconnectSensor(): Promise<void>;          // db.removeChannel
setLedPower(on: boolean): Promise<boolean>; // device_state.led_on update, 성공 여부 반환
loadPower(): Promise<boolean>;              // 앱 시작 시 device_state.led_on 읽기
```

### Supabase를 아직 연결하지 않았을 때
URL이 `<project>`를 포함하면 **데모 모드**: 0.5초마다 가상 센서값(사인파)을 만들어 같은 콜백으로 흘려보낸다. 화면 상단에 caption 크기로 "데모 데이터" 표시.


---

## Tokens

모든 값은 `styles.md`의 CSS 변수로 쓴다. Tailwind에서는 `bg-[var(--surface)]`, `text-[var(--ink)]`처럼 참조한다.

### Color (light / dark)

| 토큰 | Light | Dark | 용도 |
| --- | --- | --- | --- |
| `--surface` | #f7f6f3 | #141412 | 페이지 배경 |
| `--surface-raised` | #ffffff | #1e1d1b | 카드·패널 |
| `--ink` | #1c1b19 | #f2f0eb | 본문·제목 |
| `--ink-muted` | #5f5c56 | #a8a49c | 보조 텍스트, 단위, 축 |
| `--line` | #dddad3 | #34322e | 카드 테두리, 구분선, 그리드 |
| `--brand` | #b4430d | #f08a4b | **메인 컬러 슬롯.** 주요 버튼, 토글 ON, 차트 선, 포커스 |
| `--on-brand` | #ffffff | #1c1b19 | brand 위 텍스트 |
| `--led-off` | #8f8b83 | #6b6862 | 꺼진 LED, 토글 OFF 트랙 |
| `--led-low` | #ffd9a8 | #ffd9a8 | 센서값 최소일 때 LED |
| `--led-high` | #ffb020 | #ffb020 | 센서값 최대일 때 LED·글로우 |
| `--status-on` | #1f7a4d | #4cc38a | "연결됨" (글자와 함께) |
| `--danger` | #b42318 | #f97066 | 오류 (글자와 함께) |

메인 컬러를 바꾸면: `--on-brand`가 `--brand` 위 4.5:1 이상, `--brand`가 `--surface-raised` 위 3:1 이상인지 확인.

### Type — Pretendard, letter-spacing 지정 없음

| 이름 | size / line-height / weight | 용도 |
| --- | --- | --- |
| display | 40 / 48 / 700 | 제품 이름 (모바일은 title로) |
| value | 48 / 52 / 700 + tabular-nums | 현재 센서값 숫자 |
| title | 24 / 32 / 600 | 섹션 제목, 모바일 제품 이름 |
| heading | 18 / 26 / 600 | 카드 제목 |
| body | 16 / 24 / 400 | 설명, 본문 |
| label | 14 / 20 / 500 | 버튼, 토글, 상태 |
| caption | 12 / 16 / 400 | 축, 단위, 타임스탬프 |

### Spacing
`--space-1` 4 · `--space-2` 8 · `--space-3` 12 · `--space-4` 16 · `--space-6` 24 · `--space-8` 32 · `--space-12` 48 (px)

- 카드 패딩: 웹 space-6 / 모바일 space-4
- 카드 사이: 모바일 space-4 / 웹 space-6
- 페이지 여백: 모바일 space-4 / 웹 space-12 위, space-8 좌우

### Radius
`--radius-sm` 6 (배지) · `--radius-md` 10 (버튼) · `--radius-lg` 16 (카드) · `--radius-full` 999 (토글, LED, 상태 점)

### Breakpoint
768px 미만 1열(스마트폰), 이상 2열(웹). 콘텐츠 최대 폭 1120px 가운데 정렬.

### Shadow
카드: light `0 1px 2px rgba(28,27,25,.06)`, dark 없음 (테두리만).


---

## styles/globals.css 에 넣을 내용

아래 블록을 globals.css 맨 위에 그대로 넣는다. 메인 컬러·폰트 슬롯은 여기서만 바꾼다.

```css
@import url("https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css");

:root {
  /* ── 학생 슬롯: 메인 컬러 ── */
  --brand: #b4430d;
  --on-brand: #ffffff;
  /* ── 학생 슬롯: 폰트 ── */
  --font-sans: Pretendard, -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif;
  --font-display: var(--font-sans);

  --surface: #f7f6f3;
  --surface-raised: #ffffff;
  --ink: #1c1b19;
  --ink-muted: #5f5c56;
  --line: #dddad3;
  --led-off: #8f8b83;
  --led-low: #ffd9a8;
  --led-high: #ffb020;
  --status-on: #1f7a4d;
  --danger: #b42318;
  --shadow-card: 0 1px 2px rgba(28, 27, 25, 0.06);

  --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px;
  --space-6: 24px; --space-8: 32px; --space-12: 48px;
  --radius-sm: 6px; --radius-md: 10px; --radius-lg: 16px; --radius-full: 999px;
}

@media (prefers-color-scheme: dark) {
  :root {
    /* ── 학생 슬롯: 메인 컬러 (다크) ── */
    --brand: #f08a4b;
    --on-brand: #1c1b19;

    --surface: #141412;
    --surface-raised: #1e1d1b;
    --ink: #f2f0eb;
    --ink-muted: #a8a49c;
    --line: #34322e;
    --led-off: #6b6862;
    --status-on: #4cc38a;
    --danger: #f97066;
    --shadow-card: none;
  }
}

body { margin: 0; background: var(--surface); color: var(--ink); font-family: var(--font-sans); }
:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }

/* 타입 스타일 — letter-spacing 없음 */
.t-display { font-family: var(--font-display); font-size: 40px; line-height: 48px; font-weight: 700; }
.t-value   { font-family: var(--font-display); font-size: 48px; line-height: 52px; font-weight: 700; font-variant-numeric: tabular-nums; }
.t-title   { font-size: 24px; line-height: 32px; font-weight: 600; }
.t-heading { font-size: 18px; line-height: 26px; font-weight: 600; }
.t-body    { font-size: 16px; line-height: 24px; font-weight: 400; }
.t-label   { font-size: 14px; line-height: 20px; font-weight: 500; }
.t-caption { font-size: 12px; line-height: 16px; font-weight: 400; }
@media (max-width: 767px) { .t-display { font-size: 24px; line-height: 32px; } }

/* 카드 */
.card { background: var(--surface-raised); border: 1px solid var(--line); border-radius: var(--radius-lg); box-shadow: var(--shadow-card); padding: var(--space-6); }
@media (max-width: 767px) { .card { padding: var(--space-4); } }
```


---

## ProductHeader

화면 최상단. 제품 이름·컨셉·설명을 `PRODUCT`에서 읽어 보여준다. 2열 레이아웃에서 전체 폭.

- 이름 `t-display` `--ink` / 컨셉 `t-label` `--brand` / 설명 `t-body` `--ink-muted`, 최대 폭 640px
- 간격: 이름–컨셉 space-1, 컨셉–설명 space-3
- 값이 비어 있으면 `[제품 이름]`, `[제품 컨셉 — 한 줄]`, `[제품 설명 — 2~3문장]`을 `--line` 색 1px 점선 밑줄과 함께 표시
- 카드로 감싸지 않는다 (페이지 바탕 위에 바로)
- `document.title`도 `PRODUCT.name`으로 설정


---

## ConnectionControl

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


---

## PowerToggle

LED 전원 스위치. 컨트롤 카드 아래쪽 행 (위 행과 `--line` 1px 구분선, padding-top space-4).

- 행 구성: 왼쪽 [제목 "LED 전원" `t-heading` + 아래 "켜짐/꺼짐" `t-caption` `--ink-muted`], 오른쪽 스위치
- 스위치: `<button role="switch" aria-checked aria-label="LED 전원">`
  - 트랙 52×32 `--radius-full`, OFF `--led-off` / ON `--brand`
  - 손잡이 24×24, 4px 안쪽, OFF `--surface-raised` / ON `--on-brand`, ON일 때 오른쪽으로 20px 이동, 150ms
  - 터치 영역 최소 44px
- 누르면 즉시 UI 반영 → `setLedPower(on)` → 실패하면 이전 상태로 되돌리고 행 아래에 "전원 변경 실패 — 다시 시도" `t-caption` `--danger`
- 앱 시작 시 `loadPower()`로 초기값
- 센서 연결 여부와 무관하게 동작


---

## SensorLED

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


---

## SensorChart

Supabase 센서값 실시간 선 그래프. 라이브러리 없이 SVG. 2열 레이아웃에서 전체 폭.

- 카드 헤더: "실시간 센서값" `t-heading` / 오른쪽 "최근 60개" `t-caption` `--ink-muted`
- 데이터: `readings` 배열 (최대 MAX_POINTS, 넘치면 앞에서 제거). 새 점은 오른쪽 끝.
- SVG `viewBox="0 0 800 200"`, `width:100%` `height:auto` (스마트폰 폭에 자동 맞춤)
  - 여백 왼 40 / 오 8 / 위 8 / 아래 20
  - y축 0~SENSOR_MAX, 그리드 3줄(0, 중간, 최대) `--line` 1px, 눈금 숫자 `--ink-muted` 12px 오른쪽 정렬
  - x축 라벨: 왼쪽 "−60s", 오른쪽 "지금"
  - 선: polyline `--brand` 2px, round join/cap, 채우기 없음
- 데이터 없음: 차트 대신 "센서를 연결하면 값이 여기에 그려집니다." `t-body` `--ink-muted` 가운데, 위아래 space-8
- `role="img"`, `aria-label="센서값 추이, 현재 N"`
- 응용: 임계값 가로선(점선 `--ink-muted`), 센서 여러 개면 선별 색 + 글자 범례


---

## AppShell

전체 화면 레이아웃 + 상태 관리 (`App.tsx`).

### 레이아웃
- `<main>` 최대 폭 1120px 가운데. 여백 모바일 space-4 / 웹(≥768px) 위아래 space-12, 좌우 space-8
- grid: 모바일 1열 gap space-4 / 웹 2열 gap space-6
- 순서와 배치:
  1. ProductHeader — 전체 폭
  2. "조명 상태" 카드(SensorLED) — 웹 왼쪽
  3. "컨트롤" 카드(ConnectionControl + PowerToggle) — 웹 오른쪽
  4. SensorChart 카드 — 전체 폭
- viewport meta: `width=device-width, initial-scale=1`

### 상태
```ts
const [status, setStatus] = useState<Status>('disconnected');
const [power, setPower] = useState(false);
const [readings, setReadings] = useState<Reading[]>([]);
```
- connected 여부는 `status === 'connected'`
- 최신값 = `readings.at(-1)?.value`
- `onReading`: 배열 끝에 추가, MAX_POINTS 초과 시 앞에서 제거
- 언마운트 시 `disconnectSensor()`

### 응용
- 카드 추가: grid 안에 `.card` 추가. 전체 폭은 `col-span-full`.
