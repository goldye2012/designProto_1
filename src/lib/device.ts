import type { RealtimeChannel } from "@supabase/supabase-js"
import { DEVICE_ID, MAX_POINTS, SENSOR_MAX, SENSOR_MIN } from "../product"
import { db, isDemoMode } from "./supabase"

export type Reading = {
  value: number
  created_at: string
}

export type Status = "disconnected" | "connecting" | "connected" | "error"

type ConnectOptions = {
  onInit: (rows: Reading[]) => void
  onReading: (row: Reading) => void
  onStatus: (status: Status) => void
}

let channel: RealtimeChannel | null = null
let demoTimer: number | null = null
let demoPower = false

function stopDemo() {
  if (demoTimer !== null) {
    window.clearInterval(demoTimer)
    demoTimer = null
  }
}

export async function connectSensor({
  onInit,
  onReading,
  onStatus,
}: ConnectOptions): Promise<void> {
  await disconnectSensor()
  onStatus("connecting")

  if (isDemoMode) {
    onInit([])
    onStatus("connected")
    const startedAt = Date.now()

    demoTimer = window.setInterval(() => {
      const elapsed = (Date.now() - startedAt) / 1000
      const wave = (Math.sin(elapsed * 0.8) + 1) / 2
      const detail = Math.sin(elapsed * 2.1) * 0.04
      const normalized = Math.min(1, Math.max(0, wave * 0.88 + 0.06 + detail))
      onReading({
        value: Math.round(SENSOR_MIN + normalized * (SENSOR_MAX - SENSOR_MIN)),
        created_at: new Date().toISOString(),
      })
    }, 500)
    return
  }

  const { data, error } = await db
    .from("sensor_readings")
    .select("value, created_at")
    .eq("device_id", DEVICE_ID)
    .order("created_at", { ascending: false })
    .limit(MAX_POINTS)

  if (error) {
    onStatus("error")
    return
  }

  onInit(((data ?? []) as Reading[]).reverse())
  channel = db
    .channel(`sensor-${DEVICE_ID}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "sensor_readings",
        filter: `device_id=eq.${DEVICE_ID}`,
      },
      (payload) => onReading(payload.new as Reading),
    )
    .subscribe((subscriptionStatus) => {
      if (subscriptionStatus === "SUBSCRIBED") onStatus("connected")
      if (
        subscriptionStatus === "CHANNEL_ERROR" ||
        subscriptionStatus === "TIMED_OUT"
      ) {
        onStatus("error")
      }
    })
}

export async function disconnectSensor(): Promise<void> {
  stopDemo()
  if (channel) {
    await db.removeChannel(channel)
    channel = null
  }
}

export async function setLedPower(on: boolean): Promise<boolean> {
  if (isDemoMode) {
    demoPower = on
    return true
  }

  const { error } = await db
    .from("device_state")
    .update({ led_on: on })
    .eq("device_id", DEVICE_ID)
  return !error
}

export async function loadPower(): Promise<boolean> {
  if (isDemoMode) return demoPower

  const { data, error } = await db
    .from("device_state")
    .select("led_on")
    .eq("device_id", DEVICE_ID)
    .single()

  return error ? false : Boolean(data?.led_on)
}
