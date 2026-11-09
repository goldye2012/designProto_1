import { useState } from "react"
import { setLedPower } from "../lib/device"

type Props = {
  power: boolean
  onPowerChange: (power: boolean) => void
}

export default function PowerToggle({ power, onPowerChange }: Props) {
  const [error, setError] = useState(false)

  const handleToggle = async () => {
    const previous = power
    const next = !power
    onPowerChange(next)
    setError(false)

    if (!(await setLedPower(next))) {
      onPowerChange(previous)
      setError(true)
    }
  }

  return (
    <div>
      <div className="control-row">
        <div>
          <span className="t-label">LED 전원</span>
          <span className="power-caption t-caption">
            {power ? "켜짐" : "꺼짐"}
          </span>
        </div>
        <button
          className="power-switch"
          type="button"
          role="switch"
          aria-checked={power}
          aria-label="LED 전원"
          onClick={handleToggle}
        >
          <span className="switch-handle" />
        </button>
      </div>
      {error && (
        <p className="power-error t-caption" role="alert">
          전원 변경 실패, 다시 시도
        </p>
      )}
    </div>
  )
}
