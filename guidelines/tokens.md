# Tokens

모든 값은 `styles.md`의 CSS 변수로 쓴다. Tailwind에서는 `bg-[var(--surface)]`, `text-[var(--ink)]`처럼 참조한다.

## Color (light / dark)

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

## Type — Pretendard, letter-spacing 지정 없음

| 이름 | size / line-height / weight | 용도 |
| --- | --- | --- |
| display | 40 / 48 / 700 | 제품 이름 (모바일은 title로) |
| value | 48 / 52 / 700 + tabular-nums | 현재 센서값 숫자 |
| title | 24 / 32 / 600 | 섹션 제목, 모바일 제품 이름 |
| heading | 18 / 26 / 600 | 카드 제목 |
| body | 16 / 24 / 400 | 설명, 본문 |
| label | 14 / 20 / 500 | 버튼, 토글, 상태 |
| caption | 12 / 16 / 400 | 축, 단위, 타임스탬프 |

## Spacing
`--space-1` 4 · `--space-2` 8 · `--space-3` 12 · `--space-4` 16 · `--space-6` 24 · `--space-8` 32 · `--space-12` 48 (px)

- 카드 패딩: 웹 space-6 / 모바일 space-4
- 카드 사이: 모바일 space-4 / 웹 space-6
- 페이지 여백: 모바일 space-4 / 웹 space-12 위, space-8 좌우

## Radius
`--radius-sm` 6 (배지) · `--radius-md` 10 (버튼) · `--radius-lg` 16 (카드) · `--radius-full` 999 (토글, LED, 상태 점)

## Breakpoint
768px 미만 1열(스마트폰), 이상 2열(웹). 콘텐츠 최대 폭 1120px 가운데 정렬.

## Shadow
카드: light `0 1px 2px rgba(28,27,25,.06)`, dark 없음 (테두리만).
