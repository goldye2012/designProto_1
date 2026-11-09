import type { Status } from "../lib/device"

type Props = {
  status: Status
  onConnect: () => void
  onDisconnect: () => void
}

const STATUS_LABEL: Record<Status, string> = {
  disconnected: "연결 안 됨",
  connecting: "연결 중…",
  connected: "연결됨",
  error: "연결 실패, 다시 시도",
}

export default function ConnectionControl({
  status,
  onConnect,
  onDisconnect,
}: Props) {
  const connected = status === "connected"

  return (
    <div className="control-row">
      <div>
        <span className="t-label">센서</span>
        <div
          className={`connection-status t-label status-${status}`}
          role="status"
        >
          <span className="status-dot" aria-hidden="true" />
          {STATUS_LABEL[status]}
        </div>
      </div>
      <button
        className={`control-button t-label ${
          connected ? "secondary" : "primary"
        }`}
        type="button"
        disabled={status === "connecting"}
        onClick={connected ? onDisconnect : onConnect}
      >
        {connected ? "연결 끊기" : "센서 연결"}
      </button>
    </div>
  )
}
