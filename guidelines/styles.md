# styles/globals.css 에 넣을 내용

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
