import '../styles/ChatScreen.css';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import StatusIndicator from './StatusIndicator';
import { ConnectionStatus, ServerMessage } from '../types';

interface Props {
  callsign: string;
  messages: ServerMessage[];
  status: ConnectionStatus;
  onSend: (text: string) => void;
  onReconnect: () => void;
  onLeave: () => void;
}

export default function ChatScreen({
  callsign,
  messages,
  status,
  onSend,
  onReconnect,
  onLeave,
}: Props) {
  const canSend = status === 'connected';

  return (
    <div className="chat-screen">
      <header className="chat-header">
        <div className="chat-header-left">
          <span className="chat-title">ChatRoom</span>
          <span className="chat-callsign-chip" title="Your callsign">{callsign}</span>
        </div>
        <div className="chat-header-right">
          <StatusIndicator status={status} onReconnect={onReconnect} />
          <button
            className="leave-btn"
            onClick={onLeave}
            aria-label="Leave chat"
            title="Leave"
          >
            Leave
          </button>
        </div>
      </header>

      <MessageList messages={messages} ownCallsign={callsign} />

      <div className="chat-input-area">
        <MessageInput onSend={onSend} disabled={!canSend} />
      </div>
    </div>
  );
}
