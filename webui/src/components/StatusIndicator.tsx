import '../styles/StatusIndicator.css';
import { ConnectionStatus } from '../types';

const LABELS: Record<ConnectionStatus, string> = {
  connecting:    'Connecting…',
  connected:     'Connected',
  disconnected:  'Disconnected',
  reconnecting:  'Reconnecting…',
  failed:        'Connection lost',
};

interface Props {
  status: ConnectionStatus;
  onReconnect: () => void;
}

export default function StatusIndicator({ status, onReconnect }: Props) {
  return (
    <div className="status-indicator" role="status" aria-live="polite">
      <span className={`status-dot ${status}`} aria-hidden="true" />
      <span className={`status-label ${status}`}>{LABELS[status]}</span>
      {status === 'failed' && (
        <button className="reconnect-btn" onClick={onReconnect}>
          Reconnect
        </button>
      )}
    </div>
  );
}
