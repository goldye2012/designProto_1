import { useEffect } from "react"
import { isDemoMode } from "../lib/supabase"
import { PRODUCT } from "../product"

export default function ProductHeader() {
  useEffect(() => {
    document.title = PRODUCT.name
  }, [])

  const name = PRODUCT.name || "[제품 이름]"
  const concept = PRODUCT.concept || "[제품 컨셉, 한 줄]"
  const description = PRODUCT.description || "[제품 설명, 2~3문장]"

  return (
    <header className="product-header">
      <h1 className={`t-display ${PRODUCT.name ? "" : "placeholder"}`}>
        {name}
      </h1>
      <p
        className={`product-concept t-label ${
          PRODUCT.concept ? "" : "placeholder"
        }`}
      >
        {concept}
      </p>
      <p
        className={`product-description t-body ${
          PRODUCT.description ? "" : "placeholder"
        }`}
      >
        {description}
      </p>
      {isDemoMode && (
        <p className="demo-note t-caption">데모 데이터로 표시 중</p>
      )}
    </header>
  )
}
