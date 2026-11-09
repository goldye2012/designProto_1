import type { CSSProperties } from "react"
import { SENSOR_MAX, SENSOR_MIN } from "../product"

type Props = {
  value?: number
  power: boolean
}

export default function SensorMoon({ value, power }: Props) {
  const level =
    value === undefined
      ? 0
      : Math.min(
          1,
          Math.max(0, (value - SENSOR_MIN) / (SENSOR_MAX - SENSOR_MIN)),
        )
  const brightness = Math.round(level * 100)
  const label = power ? `달 밝기 ${brightness}%` : "달 꺼짐"

  return (
    <section className="moon-section" aria-label="달 상태">
      <div
        className="moon"
        data-power={power ? "on" : "off"}
        style={{ "--level": level } as CSSProperties}
        role="img"
        aria-label={label}
      >
        <img src="/images/moon.webp" alt="" />
      </div>
      <div className="current-reading">
        <strong className="t-value">
          {value === undefined ? "—" : value.toLocaleString("ko-KR")}
        </strong>
        <span className="t-caption">센서값</span>
      </div>
    </section>
  )
}
