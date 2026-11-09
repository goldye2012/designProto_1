import { useEffect, useMemo, useState } from "react"
import { createClient } from "@supabase/supabase-js"
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

const YEARS = [...DATA_YEARS]
const REGIONS = REGION_DATA
const READINGS_LIMIT = 100

type Reading = {
  value: number
  created_at: string
}

type ConnectionStatus = "connecting" | "live" | "offline" | "error"
const CONNECTION_LABELS: Record<ConnectionStatus, string> = {
  connecting: "연결 중",
  live: "실시간 연결",
  offline: "연결 끊김",
  error: "연결 오류",
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
      const x =
        CHART.left + (index / Math.max(values.length - 1, 1)) * innerWidth
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

function SensorDashboard({
  onConnectionChange,
}: {
  onConnectionChange: (status: ConnectionStatus) => void
}) {
  const [liveReadings, setReadings] = useState<Reading[]>([])
  const [pausedReadings, setPausedReadings] = useState<Reading[] | null>(null)
  const readings = pausedReadings ?? liveReadings
  const isPaused = pausedReadings !== null
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("connecting")
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [readingsError, setReadingsError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  useEffect(() => {
    onConnectionChange(connectionStatus)
  }, [connectionStatus, onConnectionChange])

  useEffect(() => {
    const url = import.meta.env.VITE_SUPABASE_URL
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY
    if (!url || !key) {
      setConnectionStatus("error")
      setConnectionError(
        "VITE_SUPABASE_URL 또는 VITE_SUPABASE_ANON_KEY가 .env에 없습니다.",
      )
      setIsLoading(false)
      return
    }

    const supabase = createClient(url, key)
    let active = true
    let requestId = 0

    const loadReadings = async () => {
      const currentRequestId = ++requestId
      try {
        const { data, error } = await supabase
          .from("readings")
          .select("value, created_at")
          .order("created_at", { ascending: false })
          .limit(READINGS_LIMIT)

        if (!active || currentRequestId !== requestId) return
        if (error) {
          setReadingsError(error.message)
          setIsLoading(false)
          return
        }

        setReadings((data ?? []).reverse())
        setReadingsError(null)
        setIsLoading(false)
      } catch (error) {
        if (!active || currentRequestId !== requestId) return
        setReadingsError(error instanceof Error ? error.message : String(error))
        setIsLoading(false)
      }
    }

    const channel = supabase
      .channel("readings-dashboard")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "readings" },
        () => {
          void loadReadings()
        },
      )
      .subscribe((status, error) => {
        if (!active) return

        if (status === "SUBSCRIBED") {
          setConnectionStatus("live")
          setConnectionError(null)
          void loadReadings()
        } else if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          setConnectionStatus(status === "CLOSED" ? "offline" : "error")
          setConnectionError(error?.message ?? `Realtime 상태: ${status}`)
        }
      })

    return () => {
      active = false
      requestId += 1
      void supabase.removeChannel(channel)
    }
  }, [])

  const values = readings.map((reading) => reading.value)
  const minValue = values.length ? Math.min(...values) : 0
  const maxValue = values.length ? Math.max(...values) : 1
  const padding = Math.max(
    (maxValue - minValue) * 0.15,
    Math.abs(minValue) * 0.05,
    1,
  )
  const sensorRange = { min: minValue - padding, max: maxValue + padding }
  const ticks = [
    sensorRange.max,
    (sensorRange.min + sensorRange.max) / 2,
    sensorRange.min,
  ]
  const latestReading = readings.at(-1)
  const latestY = latestReading
    ? CHART.top +
      (1 -
        (latestReading.value - sensorRange.min) /
          (sensorRange.max - sensorRange.min)) *
        (CHART.height - CHART.top - CHART.bottom)
    : null
  const connectionLabel = CONNECTION_LABELS[connectionStatus]
  const formatValue = (value: number) =>
    value.toLocaleString(undefined, { maximumFractionDigits: 2 })
  const formatTimestamp = (value: string) =>
    new Date(value).toLocaleString("ko-KR", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  const formatAxisTimestamp = (value: string) =>
    new Date(value).toLocaleString("ko-KR", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })

  return (
    <>
      <section className="sensor-hero">
        <div>
          <p className="eyebrow">LIVE ENVIRONMENT · SENSOR 01</p>
          <h1>
            공간을,
            <br />
            감지하다
          </h1>
        </div>
        <div className={`sensor-connection ${connectionStatus}`}>
          <div
            className={`connection-pulse ${connectionStatus}`}
            aria-hidden="true"
          />
          <div>
            <span>센서 상태</span>
            <strong>{connectionLabel}</strong>
          </div>
          <small>
            {latestReading
              ? `마지막 기록 · ${formatTimestamp(latestReading.created_at)}`
              : "기록 대기 중"}
          </small>
        </div>
      </section>

      <section className="sensor-dashboard">
        <div className="sensor-heading">
          <div>
            <p className="eyebrow">LATEST READING</p>
            <h2>현재 센서값</h2>
          </div>
          <div className="sensor-heading-actions">
            <button
              type="button"
              className={`sensor-pause-button ${isPaused ? "paused" : ""}`}
              aria-pressed={isPaused}
              onClick={() =>
                setPausedReadings(isPaused ? null : liveReadings)
              }
            >
              {isPaused ? "▶ 재개" : "■ 정지"}
            </button>
            <span
              className={`mock-badge ${isPaused ? "offline" : connectionStatus}`}
            >
              {isPaused ? "일시정지" : connectionLabel}
            </span>
          </div>
        </div>

        <div className="sensor-reading-card">
          <span className="sensor-card-index">PUBLIC.READINGS · VALUE</span>
          <div className="sensor-card-title">
            <span>최신 측정값</span>
            <span
              className={`sensor-card-dot ${
                connectionStatus === "live" ? "active" : ""
              }`}
            />
          </div>
          <div className="sensor-value">
            <strong>
              {latestReading ? formatValue(latestReading.value) : "--"}
            </strong>
          </div>
          <div className="sensor-card-footer">
            <span>
              {latestReading
                ? formatTimestamp(latestReading.created_at)
                : isLoading
                  ? "데이터를 불러오는 중입니다"
                  : "표시할 기록이 없습니다"}
            </span>
            <strong>
              {readings.length}/{READINGS_LIMIT}건
            </strong>
          </div>
        </div>
        {connectionError && (
          <p className="sensor-error" role="alert">
            Realtime 연결 오류: {connectionError}
          </p>
        )}
        {readingsError && (
          <p className="sensor-error" role="alert">
            readings 조회 오류: {readingsError}
          </p>
        )}
      </section>

      <section className="sensor-dashboard sensor-chart-section">
        <div className="sensor-heading">
          <div>
            <p className="eyebrow">LATEST {READINGS_LIMIT} RECORDS</p>
            <h2>센서값 변화 추이</h2>
          </div>
          <div className="sensor-chart-value">
            <span>현재</span>
            <strong>
              {latestReading ? formatValue(latestReading.value) : "--"}
            </strong>
          </div>
        </div>

        <div className="sensor-chart-frame">
          <div className="chart-meta">
            <span>readings.value · 최근 {readings.length}건</span>
            <span>
              {readings.length
                ? `${formatTimestamp(readings[0].created_at)} — ${formatTimestamp(readings[readings.length - 1].created_at)}`
                : "기록 없음"}
            </span>
          </div>
          <svg
            className="line-chart sensor-chart"
            viewBox={`0 0 ${CHART.width} ${CHART.height}`}
            role="img"
            aria-label={`최근 ${readings.length}개 센서값 변화 그래프`}
          >
            <g className="axes">
              {ticks.map((tick, index) => {
                const y =
                  CHART.top +
                  (index / 2) * (CHART.height - CHART.top - CHART.bottom)
                return (
                  <g key={tick}>
                    <line
                      x1={CHART.left}
                      y1={y}
                      x2={CHART.width - CHART.right}
                      y2={y}
                    />
                    <text x={CHART.left - 12} y={y + 4} textAnchor="end">
                      {formatValue(tick)}
                    </text>
                  </g>
                )
              })}
              {readings.length > 0 &&
                [0, 0.25, 0.5, 0.75, 1].map((position) => {
                  const index = Math.round(position * (readings.length - 1))
                  const x =
                    CHART.left +
                    position * (CHART.width - CHART.left - CHART.right)
                  return (
                    <text
                      key={position}
                      x={x}
                      y={CHART.height - 10}
                      textAnchor="middle"
                    >
                      {formatAxisTimestamp(readings[index].created_at)}
                    </text>
                  )
                })}
            </g>
            <path
              d={pathFor(values, sensorRange)}
              className="sensor-line-glow"
            />
            <path d={pathFor(values, sensorRange)} className="sensor-line" />
            {latestY !== null && (
              <>
                <line
                  className="sensor-now-line"
                  x1={CHART.width - CHART.right}
                  y1={CHART.top}
                  x2={CHART.width - CHART.right}
                  y2={CHART.height - CHART.bottom}
                />
                <circle
                  className="sensor-last-dot"
                  cx={CHART.width - CHART.right}
                  cy={latestY}
                  r="6"
                />
              </>
            )}
          </svg>
          {readings.length === 0 && (
            <div className="sensor-chart-empty">
              {isLoading
                ? "데이터를 불러오는 중입니다"
                : "표시할 데이터가 없습니다"}
            </div>
          )}
        </div>
      </section>

      <section className="sensor-info-strip">
        <div>
          <span>데이터 소스</span>
          <strong>public.readings</strong>
        </div>
        <div>
          <span>표시 구간</span>
          <strong>최근 100건</strong>
        </div>
        <div>
          <span>저장 방식</span>
          <strong>Supabase Realtime</strong>
        </div>
        <div>
          <span>현재 로드</span>
          <strong>{readings.length}건</strong>
        </div>
      </section>
    </>
  )
}

export default function App() {
  const [view, setView] = useState<"population" | "sensor">("sensor")
  const [sensorConnection, setSensorConnection] =
    useState<ConnectionStatus>("connecting")
  const [type, setType] = useState<"전체" | RegionType>("전체")
  const [selectedLine, setSelectedLine] = useState("경기도/용인시")
  const [hoveredLine, setHoveredLine] = useState<string | null>(null)
  const [province, setProvince] = useState("서울특별시")
  const [query, setQuery] = useState("")
  const [searchOpen, setSearchOpen] = useState(false)

  const visibleRegions =
    type === "전체" ? REGIONS : REGIONS.filter((region) => region.type === type)
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
  const selectedRegion = REGIONS.find((region) => region.id === selectedLine)

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
        <nav className="dashboard-nav" aria-label="대시보드 화면 선택">
          <button
            type="button"
            className={view === "sensor" ? "active" : ""}
            onClick={() => setView("sensor")}
          >
            센서 모니터링
          </button>
          <button
            type="button"
            className={view === "population" ? "active" : ""}
            onClick={() => setView("population")}
          >
            인구 통계
          </button>
        </nav>
        <div className="data-status">
          <span
            className={`status-dot ${
              view === "sensor" ? sensorConnection : ""
            }`}
          />
          {view === "population"
            ? "첨부 통계 원본 · 2025년 기준"
            : `SUPABASE · ${CONNECTION_LABELS[sensorConnection]}`}
        </div>
      </header>

      {view === "population" ? (
        <>
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
                <h2>시·군·구 정규화 추이</h2>
              </div>
              <div className="tabs" role="group" aria-label="지역 유형 선택">
                {(["전체", "시", "군", "구"] as const).map((item) => (
                  <button
                    key={item}
                    className={type === item ? "active" : ""}
                    onClick={() => setType(item)}
                    type="button"
                  >
                    {item}
                    <span>
                      {item === "전체"
                        ? REGIONS.length
                        : REGIONS.filter((region) => region.type === item)
                            .length}
                    </span>
                  </button>
                ))}
              </div>
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
                aria-label="지역별 정규화 가구수 변화 라인 차트"
              >
                <Axes />
                {visibleRegions.map((region) => {
                  const isActive = selectedLine === region.id
                  const isHovered = hoveredLine === region.id
                  return (
                    <path
                      key={region.id}
                      d={pathFor(normalize(region.values))}
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
              <div className="selected-label">
                <span className="label-line" />
                <div>
                  <small>SELECTED</small>
                  <strong>{selectedRegion?.name}</strong>
                </div>
                <span>{selectedRegion?.province}</span>
              </div>
            </div>

            <div className="region-legend">
              {visibleRegions.map((region) => (
                <button
                  type="button"
                  key={region.id}
                  className={selectedLine === region.id ? "active" : ""}
                  onClick={() => setSelectedLine(region.id)}
                >
                  <span className="legend-line" />
                  {region.name}
                  <small>{region.type}</small>
                </button>
              ))}
            </div>
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
                      (1 -
                        (value - rawRange.min) /
                          (rawRange.max - rawRange.min)) *
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
        </>
      ) : (
        <SensorDashboard onConnectionChange={setSensorConnection} />
      )}

      <footer>
        <span>
          {view === "population" ? "POPULATION LINES" : "SENSOR SIGNAL"} © 2025
        </span>
        <span>
          {view === "population"
            ? "데이터 출처 · 사용자 제공 population.csv"
            : "데이터 출처 · Supabase public.readings"}
        </span>
      </footer>
    </main>
  )
}
