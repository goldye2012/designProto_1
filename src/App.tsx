import { useCallback, useEffect, useState } from "react"
import ConnectionControl from "./components/ConnectionControl"
import PowerToggle from "./components/PowerToggle"
import ProductHeader from "./components/ProductHeader"
import SensorChart from "./components/SensorChart"
import SensorMoon from "./components/SensorMoon"
import {
  connectSensor,
  disconnectSensor,
  loadPower,
  type Reading,
  type Status,
} from "./lib/device"
import { MAX_POINTS } from "./product"

export default function App() {
  const [status, setStatus] = useState<Status>("disconnected")
  const [power, setPower] = useState(false)
  const [readings, setReadings] = useState<Reading[]>([])

  useEffect(() => {
    let active = true

    void loadPower().then((nextPower) => {
      if (active) setPower(nextPower)
    })

    return () => {
      active = false
      void disconnectSensor()
    }
  }, [])

  const handleReading = useCallback((reading: Reading) => {
    setReadings((current) => [...current, reading].slice(-MAX_POINTS))
  }, [])

  const handleConnect = useCallback(() => {
    void connectSensor({
      onInit: setReadings,
      onReading: handleReading,
      onStatus: setStatus,
    })
  }, [handleReading])

  const handleDisconnect = useCallback(() => {
    void disconnectSensor().then(() => setStatus("disconnected"))
  }, [])

  const latestValue = readings.at(-1)?.value

  return (
    <main className="app-shell">
      <ProductHeader />
      <SensorMoon value={latestValue} power={power} />
      <div className="lower-grid">
        <section className="controls" aria-label="조명 제어">
          <ConnectionControl
            status={status}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
          />
          <PowerToggle power={power} onPowerChange={setPower} />
        </section>
        <SensorChart readings={readings} />
      </div>
    </main>
  )
}
