import { useMemo, useState } from "react"
import {
  DATA_YEARS,
  NATIONAL_DATA,
  PROVINCE_DATA,
  REGION_DATA,
  type DataValue,
} from "./populationData"

type RegionType = "시" | "군" | "구"
type ChartRange = {
  min: number
  max: number
}
type ComparisonSeries = {
  id: string
  name: string
  values: DataValue[]
}
const YEARS = [...DATA_YEARS]
const REGIONS = REGION_DATA
const METROPOLITAN_CITY_REGIONS = PROVINCE_DATA.filter((region) =>
  /(?:특별시|광역시)$/.test(region.name),
).map((region) => ({
  ...region,
  id: `metropolitan/${region.name}`,
  type: "시" as const,
  province: "특별시·광역시",
}))
const CHART_REGIONS = [...REGIONS, ...METROPOLITAN_CITY_REGIONS]
const REGION_TYPES: RegionType[] = ["시", "군", "구"]
const DISTRICT_CITY_GROUPS = [
  {
    city: "수원시",
    districts: ["경기도/장안구", "경기도/권선구", "경기도/팔달구", "경기도/영통구"],
  },
  {
    city: "성남시",
    districts: ["경기도/수정구", "경기도/중원구", "경기도/분당구"],
  },
  { city: "안양시", districts: ["경기도/만안구", "경기도/동안구"] },
  {
    city: "부천시",
    districts: ["경기도/원미구", "경기도/소사구", "경기도/오정구"],
  },
  { city: "안산시", districts: ["경기도/상록구", "경기도/단원구"] },
  {
    city: "고양시",
    districts: [
      "경기도/덕양구",
      "경기도/일산구",
      "경기도/일산동구",
      "경기도/일산서구",
    ],
  },
  {
    city: "용인시",
    districts: ["경기도/처인구", "경기도/기흥구", "경기도/수지구"],
  },
  {
    city: "화성시",
    districts: [
      "경기도/만세구",
      "경기도/효행구",
      "경기도/병점구",
      "경기도/동탄구",
    ],
  },
  {
    city: "청주시",
    districts: ["충청북도/상당구", "충청북도/서원구", "충청북도/흥덕구", "충청북도/청원구"],
  },
  { city: "천안시", districts: ["충청남도/동남구", "충청남도/서북구"] },
  { city: "전주시", districts: ["전북특별자치도/완산구", "전북특별자치도/덕진구"] },
  { city: "포항시", districts: ["경상북도/남구", "경상북도/북구"] },
  {
    city: "창원시",
    districts: [
      "경상남도/의창구",
      "경상남도/성산구",
      "경상남도/마산합포구",
      "경상남도/마산회원구",
      "경상남도/진해구",
    ],
  },
]
const DISTRICT_CITY_BY_ID = new Map<string, string>(
  DISTRICT_CITY_GROUPS.flatMap(({ city, districts }) =>
    districts.map((district) => [district, city] as const),
  ),
)

function districtCity(region: (typeof REGIONS)[number]) {
  return DISTRICT_CITY_BY_ID.get(region.id) ?? region.province
}

const DISTRICT_CITIES = [
  ...new Set(
    REGIONS.filter((region) => region.type === "구").map(districtCity),
  ),
]
const COUNTY_PROVINCES = [
  ...new Set(
    REGIONS.filter((region) => region.type === "군").map((region) => region.province),
  ),
]

function districtCityColor(region: (typeof REGIONS)[number]) {
  const cityIndex = DISTRICT_CITIES.indexOf(districtCity(region))
  const hue = (cityIndex * 360) / DISTRICT_CITIES.length
  return `hsl(${hue} 72% 66%)`
}

function countyProvinceColor(region: (typeof REGIONS)[number]) {
  const provinceIndex = COUNTY_PROVINCES.indexOf(region.province)
  const hue = (provinceIndex * 360) / COUNTY_PROVINCES.length
  return `hsl(${hue} 72% 66%)`
}

function metropolitanCityColor(region: { id: string }) {
  const cityIndex = METROPOLITAN_CITY_REGIONS.findIndex(
    (city) => city.id === region.id,
  )
  const hue = (cityIndex * 360) / METROPOLITAN_CITY_REGIONS.length
  return `hsl(${hue} 72% 52%)`
}

const CHART = {
  width: 920,
  height: 300,
  left: 54,
  right: 24,
  top: 24,
  bottom: 40,
}

function normalize(values: DataValue[]) {
  const available = values.filter((value): value is number => value !== null)
  const min = Math.min(...available)
  const max = Math.max(...available)
  return values.map((value) =>
    value === null ? null : max === min ? 0.5 : (value - min) / (max - min),
  )
}

function pathFor(values: DataValue[], range?: ChartRange) {
  const innerWidth = CHART.width - CHART.left - CHART.right
  const innerHeight = CHART.height - CHART.top - CHART.bottom
  const min = range?.min ?? 0
  const max = range?.max ?? 1
  let drawing = false
  return values
    .map((value, index) => {
      if (value === null) {
        drawing = false
        return ""
      }
      const x = CHART.left + (index / (values.length - 1)) * innerWidth
      const y = CHART.top + (1 - (value - min) / (max - min)) * innerHeight
      const command = drawing ? "L" : "M"
      drawing = true
      return `${command} ${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(" ")
}

function Icon({ name }: { name: "search" | "arrow" | "info" }) {
  if (name === "search") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="11" cy="11" r="6.5" />
        <path d="m16 16 4 4" />
      </svg>
    )
  }
  if (name === "arrow") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 12h14m-5-5 5 5-5 5" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6m0-10v.2" />
    </svg>
  )
}

function Axes({ rawRange }: { rawRange?: ChartRange }) {
  const ticks = rawRange
    ? [
        rawRange.max,
        rawRange.min + (rawRange.max - rawRange.min) / 2,
        rawRange.min,
      ]
    : [1, 0.5, 0]
  return (
    <g className="axes">
      {ticks.map((tick, index) => {
        const y =
          CHART.top + (index / 2) * (CHART.height - CHART.top - CHART.bottom)
        return (
          <g key={tick}>
            <line
              x1={CHART.left}
              y1={y}
              x2={CHART.width - CHART.right}
              y2={y}
            />
            <text x={CHART.left - 12} y={y + 4} textAnchor="end">
              {rawRange ? Math.round(tick).toLocaleString() : tick.toFixed(1)}
            </text>
          </g>
        )
      })}
      {YEARS.map((year, index) => {
        const x =
          CHART.left +
          (index / (YEARS.length - 1)) *
            (CHART.width - CHART.left - CHART.right)
        return (
          <text key={year} x={x} y={CHART.height - 10} textAnchor="middle">
            {index % 5 === 0 || index === YEARS.length - 1 ? year : ""}
          </text>
        )
      })}
    </g>
  )
}

export default function App() {
  const [comparisonType, setComparisonType] = useState<"시" | "도">("도")
  const [selectedLine, setSelectedLine] = useState("경기도/용인시")
  const [hoveredLine, setHoveredLine] = useState<string | null>(null)
  const [province, setProvince] = useState("서울특별시")
  const [query, setQuery] = useState("")
  const [searchOpen, setSearchOpen] = useState(false)

  const provinceValues =
    PROVINCE_DATA.find((item) => item.name === province)?.values ?? []
  const availableProvinceValues = provinceValues.filter(
    (value): value is number => value !== null,
  )
  const rawRange = useMemo(() => {
    const minValue = Math.min(...availableProvinceValues)
    const maxValue = Math.max(...availableProvinceValues)
    const padding = Math.max((maxValue - minValue) * 0.18, 20)
    return { min: minValue - padding, max: maxValue + padding }
  }, [availableProvinceValues])
  const filteredProvinces = PROVINCE_DATA.map((item) => item.name).filter(
    (item) => item.includes(query.trim()),
  )
  const lastValue = availableProvinceValues.at(-1) ?? 0
  const firstValue = availableProvinceValues[0] ?? 0
  const changeRate = ((lastValue - firstValue) / firstValue) * 100
  const nationalLatest = NATIONAL_DATA.at(-1) ?? 0
  const nationalPrevious = NATIONAL_DATA.at(-2) ?? 0
  const nationalChange = nationalLatest - nationalPrevious
  const nationalChangeRate = (nationalChange / nationalPrevious) * 100
  const selectedRegion = CHART_REGIONS.find((region) => region.id === selectedLine)

  const comparisonRegions: ComparisonSeries[] =
    comparisonType === "시"
      ? CHART_REGIONS.filter((region) => region.type === "시").map(
          ({ id, name, values }) => ({ id, name, values }),
        )
      : PROVINCE_DATA.filter((region) => region.name.endsWith("도")).map(
          (region) => ({ ...region, id: region.name }),
        )
  const comparisonRows = comparisonRegions
    .flatMap((region) => {
      const firstIndex = region.values.findIndex((value) => value !== null)
      let lastIndex = -1
      for (let index = region.values.length - 1; index >= 0; index -= 1) {
        if (region.values[index] !== null) {
          lastIndex = index
          break
        }
      }
      const firstValue = region.values[firstIndex]
      const lastValue = region.values[lastIndex]
      if (
        firstIndex < 0 ||
        lastIndex < 0 ||
        firstValue === null ||
        firstValue === undefined ||
        lastValue === null ||
        lastValue === undefined ||
        firstValue === 0
      ) {
        return []
      }
      return [
        {
          id: region.id,
          name: region.name,
          startYear: YEARS[firstIndex],
          endYear: YEARS[lastIndex],
          rate: ((lastValue - firstValue) / firstValue) * 100,
        },
      ]
    })
    .sort((first, second) => second.rate - first.rate)
  const comparisonScale = Math.max(
    ...comparisonRows.map((region) => Math.abs(region.rate)),
    1,
  )

  const chooseProvince = (item: string) => {
    setProvince(item)
    setQuery("")
    setSearchOpen(false)
  }

  return (
    <main className="dashboard-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <strong>인구선</strong>
          <span className="brand-subtitle">대한민국 인구통계 아카이브</span>
        </div>
        <div className="data-status">
          <span className="status-dot" />
          첨부 통계 원본 · 2025년 기준
        </div>
      </header>

      <section className="intro">
        <div>
          <p className="eyebrow">DEMOGRAPHIC INDEX · 2000—2025</p>
          <h1>
            인구,
            <br />
            자라다
          </h1>
        </div>
        <p className="intro-copy">
          서로 다른 규모의 도시를 같은 기준으로 비교하고,
          <br />
          시도별 가구수의 실제 변화를 시간순으로 탐색합니다.
        </p>
      </section>

      <section className="stat-strip" aria-label="주요 가구 지표">
        <div className="stat">
          <span>전국 총 가구</span>
          <strong>{nationalLatest.toLocaleString()}</strong>
          <small>가구 · 2025</small>
        </div>
        <div className="stat">
          <span>전년 대비</span>
          <strong className={nationalChangeRate < 0 ? "down" : "up"}>
            {nationalChangeRate > 0 ? "+" : ""}
            {nationalChangeRate.toFixed(2)}%
          </strong>
          <small>
            {nationalChange > 0 ? "+" : ""}
            {nationalChange.toLocaleString()}가구
          </small>
        </div>
        <div className="stat">
          <span>분석 지역</span>
          <strong>{REGIONS.length}</strong>
          <small>시 · 군 · 구</small>
        </div>
        <div className="stat stat-note">
          <Icon name="info" />
          <span>
            각 지역의 최소값을 0, 최대값을 1로 변환해 규모와 무관한 변화의
            방향을 비교합니다.
          </span>
        </div>
      </section>

      <section className="chart-section">
        <div className="section-heading">
          <div>
            <div className="section-number">01</div>
            <p className="eyebrow">NORMALIZED OVERVIEW</p>
            <h2>시·군·구별 정규화 추이</h2>
          </div>
          <p className="normalized-description">
            지역 유형별 그래프 · 각 지역의 최소 0, 최대 1
          </p>
        </div>

        {REGION_TYPES.map((regionType) => {
          const regions = CHART_REGIONS.filter((region) => region.type === regionType)
          const selectedInGroup = selectedRegion?.type === regionType

          return (
            <div className="normalized-group" key={regionType}>
              <div className="normalized-group-heading">
                <h3>{regionType}</h3>
                <span>{regions.length}개 지역</span>
              </div>
              <div className="chart-frame overview-frame">
                <div className="chart-meta">
                  <span>정규화 지수</span>
                  <span>라인을 선택해 강조</span>
                </div>
                <svg
                  className="line-chart"
                  viewBox={`0 0 ${CHART.width} ${CHART.height}`}
                  role="img"
                  aria-label={`${regionType} 지역 정규화 가구수 변화 라인 차트`}
                >
                  <Axes />
                  {regions.map((region) => {
                    const isActive = selectedLine === region.id
                    const isHovered = hoveredLine === region.id
                    return (
                      <path
                        key={region.id}
                        d={pathFor(normalize(region.values))}
                        style={
                          regionType === "시" &&
                          METROPOLITAN_CITY_REGIONS.some(
                            (city) => city.id === region.id,
                          )
                            ? {
                              stroke: metropolitanCityColor(region),
                              }
                            : regionType === "구"
                              ? { stroke: districtCityColor(region) }
                              : regionType === "군"
                                ? { stroke: countyProvinceColor(region) }
                                : undefined
                        }
                        className={`data-line ${isActive ? "selected" : ""} ${
                          isHovered ? "hovered" : ""
                        }`}
                        onClick={() => setSelectedLine(region.id)}
                        onMouseEnter={() => setHoveredLine(region.id)}
                        onMouseLeave={() => setHoveredLine(null)}
                        tabIndex={0}
                        onKeyDown={(event) =>
                          event.key === "Enter" && setSelectedLine(region.id)
                        }
                        aria-label={`${region.province} ${region.name} 라인 선택`}
                      />
                    )
                  })}
                </svg>
                {selectedInGroup && (
                  <div className="selected-label">
                    <span
                      className="label-line"
                      style={
                        regionType === "시" &&
                        METROPOLITAN_CITY_REGIONS.some(
                          (city) => city.id === selectedRegion.id,
                        )
                          ? {
                            backgroundColor: metropolitanCityColor(selectedRegion),
                            }
                          : regionType === "구"
                            ? { backgroundColor: districtCityColor(selectedRegion) }
                            : regionType === "군"
                              ? { backgroundColor: countyProvinceColor(selectedRegion) }
                              : undefined
                      }
                    />
                    <div>
                      <small>SELECTED</small>
                      <strong>{selectedRegion.name}</strong>
                    </div>
                    <span>{selectedRegion.province}</span>
                  </div>
                )}
              </div>
              <div className="region-legend">
                {regions.map((region) => (
                  <button
                    type="button"
                    key={region.id}
                    className={selectedLine === region.id ? "active" : ""}
                    onClick={() => setSelectedLine(region.id)}
                  >
                    <span
                      className="legend-line"
                      style={
                        regionType === "시" &&
                        METROPOLITAN_CITY_REGIONS.some(
                          (city) => city.id === region.id,
                        )
                          ? {
                              backgroundColor: metropolitanCityColor(region),
                            }
                          : regionType === "구"
                            ? { backgroundColor: districtCityColor(region) }
                            : regionType === "군"
                              ? { backgroundColor: countyProvinceColor(region) }
                              : undefined
                      }
                    />
                    {region.name}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </section>

      <section className="chart-section raw-section">
        <div className="section-heading">
          <div>
            <div className="section-number">02</div>
            <p className="eyebrow">PROVINCE RAW DATA</p>
            <h2>시도별 실제 가구 추이</h2>
          </div>
          <div className="search-wrap">
            <label htmlFor="province-search">시도 검색</label>
            <div className="search-box">
              <Icon name="search" />
              <input
                id="province-search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  setSearchOpen(true)
                }}
                onFocus={() => setSearchOpen(true)}
                placeholder={province}
                autoComplete="off"
              />
              <span className="shortcut">⌘ K</span>
            </div>
            {searchOpen && (
              <div className="search-results">
                {filteredProvinces.slice(0, 7).map((item) => (
                  <button
                    type="button"
                    key={item}
                    onMouseDown={() => chooseProvince(item)}
                  >
                    <span>{item}</span>
                    {item === province && <small>선택됨</small>}
                  </button>
                ))}
                {filteredProvinces.length === 0 && (
                  <p>일치하는 시도가 없습니다.</p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="raw-grid">
          <aside className="raw-summary">
            <p className="eyebrow">SELECTED REGION</p>
            <h3>{province}</h3>
            <div className="raw-primary">
              <strong>{lastValue.toLocaleString()}</strong>
              <span>가구</span>
            </div>
            <div className="change-row">
              <span>전체 기간 변화</span>
              <strong className={changeRate < 0 ? "down" : "up"}>
                {changeRate > 0 ? "+" : ""}
                {changeRate.toFixed(1)}%
              </strong>
            </div>
            <div className="change-row">
              <span>기준 연도</span>
              <strong>2025</strong>
            </div>
            <button className="detail-button" type="button">
              원본 CSV 제공됨 <Icon name="arrow" />
            </button>
          </aside>
          <div className="chart-frame raw-frame">
            <div className="chart-meta">
              <span>가구수 · 가구</span>
              <span>2000—2025</span>
            </div>
            <svg
              className="line-chart"
              viewBox={`0 0 ${CHART.width} ${CHART.height}`}
              role="img"
              aria-label={`${province} 실제 가구수 변화 라인 차트`}
            >
              <Axes rawRange={rawRange} />
              <path
                d={pathFor(provinceValues, rawRange)}
                className="raw-line-shadow"
              />
              <path
                d={pathFor(provinceValues, rawRange)}
                className="raw-line"
              />
              {provinceValues.map((value, index) => {
                if (value === null) return null
                const x =
                  CHART.left +
                  (index / (provinceValues.length - 1)) *
                    (CHART.width - CHART.left - CHART.right)
                const y =
                  CHART.top +
                  (1 - (value - rawRange.min) / (rawRange.max - rawRange.min)) *
                    (CHART.height - CHART.top - CHART.bottom)
                return (
                  <circle
                    key={YEARS[index]}
                    cx={x}
                    cy={y}
                    r={index === provinceValues.length - 1 ? 5 : 2.5}
                    className={
                      index === provinceValues.length - 1
                        ? "last-dot"
                        : "raw-dot"
                    }
                  />
                )
              })}
            </svg>
          </div>
        </div>
      </section>

      <section className="chart-section comparison-section">
        <div className="section-heading">
          <div>
            <div className="section-number">03</div>
            <p className="eyebrow">GROWTH RATE COMPARISON</p>
            <h2>시·도 증감률 비교</h2>
          </div>
          <div className="tabs" role="group" aria-label="비교 지역 유형 선택">
            {(["시", "도"] as const).map((item) => (
              <button
                key={item}
                className={comparisonType === item ? "active" : ""}
                onClick={() => setComparisonType(item)}
                type="button"
                aria-pressed={comparisonType === item}
              >
                {item}
                <span>
                  {item === "시"
                    ? CHART_REGIONS.filter((region) => region.type === "시").length
                    : PROVINCE_DATA.filter((region) => region.name.endsWith("도"))
                        .length}
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="chart-frame comparison-frame">
          <div className="chart-meta comparison-meta">
            <span>
              첫 유효 연도—2025 증감률 · {comparisonRows.length}개 지역
            </span>
            <span>감소 ← 0 → 증가</span>
          </div>
          <div className="comparison-list">
            {comparisonRows.map((region) => {
              const isNegative = region.rate < 0
              const barWidth =
                (Math.abs(region.rate) / comparisonScale) * 50
              return (
                <div className="comparison-row" key={region.id}>
                  <div className="comparison-region">
                    <strong>{region.name}</strong>
                    <small>
                      {region.startYear}—{region.endYear}
                    </small>
                  </div>
                  <div
                    className="comparison-track"
                    role="img"
                    aria-label={`${region.name} 증감률 ${region.rate.toFixed(1)}%`}
                  >
                    <span
                      className={`comparison-bar ${isNegative ? "negative" : ""}`}
                      style={{
                        left: isNegative ? `${50 - barWidth}%` : "50%",
                        width: `${barWidth}%`,
                      }}
                    />
                  </div>
                  <strong
                    className={`comparison-rate ${isNegative ? "down" : "up"}`}
                  >
                    {region.rate > 0 ? "+" : ""}
                    {region.rate.toFixed(1)}%
                  </strong>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <footer>
        <span>POPULATION LINES © 2025</span>
        <span>데이터 출처 · 사용자 제공 population.csv</span>
      </footer>
    </main>
  )
}
