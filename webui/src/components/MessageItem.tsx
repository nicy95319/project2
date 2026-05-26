import '../styles/MessageItem.css';
import { ServerMessage } from '../types';

interface Props {
  message: ServerMessage;
  ownCallsign: string;
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function MessageItem({ message, ownCallsign }: Props) {
  if (message.type === 'system') {
    const text =
      message.event === 'user_joined'
        ? `${message.callsign} joined`
        : `${message.callsign} left`;
    return (
      <div className="msg-row system">
        <span className="msg-system">{text}</span>
      </div>
    );
  }

  const isOwn = message.callsign === ownCallsign;
  return (
    <div className={`msg-row ${isOwn ? 'own' : 'other'}`}>
      {!isOwn && (
        <div className="msg-meta">
          <span className="msg-callsign">{message.callsign}</span>
          <span className="msg-timestamp">{formatTime(message.timestamp)}</span>
        </div>
      )}
      <div className="msg-bubble">{message.text}</div>
      {isOwn && (
        <div className="msg-meta">
          <span className="msg-timestamp">{formatTime(message.timestamp)}</span>
        </div>
      )}
    </div>
  );
}
