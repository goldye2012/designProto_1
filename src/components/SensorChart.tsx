import { useEffect, useRef, useState } from "react"
import type { Reading } from "../lib/device"
import { SENSOR_MAX } from "../product"

type Props = {
  readings: Reading[]
}

const HEIGHT = 200
const PADDING = { left: 40, right: 8, top: 8, bottom: 20 }

export default function SensorChart({ readings }: Props) {
  const containerRef = useRef<HTMLElement>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width)
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  const plotWidth = Math.max(0, width - PADDING.left - PADDING.right)
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom
  const points = readings
    .map((reading, index) => {
      const x =
        PADDING.left + (index / Math.max(readings.length - 1, 1)) * plotWidth
      const normalized = Math.min(1, Math.max(0, reading.value / SENSOR_MAX))
      const y = PADDING.top + (1 - normalized) * plotHeight
      return `${x},${y}`
    })
    .join(" ")
  const latest = readings.at(-1)?.value
  const ticks = [SENSOR_MAX, Math.round(SENSOR_MAX / 2), 0]

  return (
    <section
      ref={containerRef}
      className="sensor-chart"
      aria-label="실시간 센서값"
    >
      {readings.length === 0 ? (
        <p className="chart-empty t-body">
          센서를 연결하면 값이 여기에 그려집니다.
        </p>
      ) : (
        <svg
          width={width}
          height={HEIGHT}
          viewBox={`0 0 ${width} ${HEIGHT}`}
          role="img"
          aria-label={`센서값 추이, 현재 ${latest?.toLocaleString("ko-KR")}`}
        >
          {ticks.map((tick, index) => {
            const y = PADDING.top + (index / 2) * plotHeight
            return (
              <g key={tick}>
                <line
                  className="chart-grid"
                  x1={PADDING.left}
                  x2={width - PADDING.right}
                  y1={y}
                  y2={y}
                />
                <text
                  className="chart-label"
                  x={PADDING.left - 4}
                  y={y + 4}
                  textAnchor="end"
                >
                  {tick.toLocaleString("ko-KR")}
                </text>
              </g>
            )
          })}
          <polyline className="chart-line" points={points} />
          <text className="chart-label" x={PADDING.left} y={HEIGHT - 4}>
            −60s
          </text>
          <text
            className="chart-label"
            x={width - PADDING.right}
            y={HEIGHT - 4}
            textAnchor="end"
          >
            지금
          </text>
        </svg>
      )}
    </section>
  )
}
