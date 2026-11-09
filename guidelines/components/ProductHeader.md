# ProductHeader

화면 최상단. 제품 이름·컨셉·설명을 `PRODUCT`에서 읽어 보여준다. 2열 레이아웃에서 전체 폭.

- 이름 `t-display` `--ink` / 컨셉 `t-label` `--brand` / 설명 `t-body` `--ink-muted`, 최대 폭 640px
- 간격: 이름–컨셉 space-1, 컨셉–설명 space-3
- 값이 비어 있으면 `[제품 이름]`, `[제품 컨셉 — 한 줄]`, `[제품 설명 — 2~3문장]`을 `--line` 색 1px 점선 밑줄과 함께 표시
- 카드로 감싸지 않는다 (페이지 바탕 위에 바로)
- `document.title`도 `PRODUCT.name`으로 설정
