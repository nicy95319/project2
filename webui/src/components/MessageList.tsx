import { useEffect, useRef } from 'react';
import MessageItem from './MessageItem';
import { ServerMessage } from '../types';

interface Props {
  messages: ServerMessage[];
  ownCallsign: string;
}

export default function MessageList({ messages, ownCallsign }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="message-list-wrapper" role="log" aria-label="Chat messages" aria-live="polite">
      {messages.length === 0 && (
        <div className="message-list-empty">
          <span>No messages yet.</span>
          <span style={{ fontSize: '12px' }}>Be the first to say something!</span>
        </div>
      )}
      {messages.map((msg, i) => (
        <MessageItem key={i} message={msg} ownCallsign={ownCallsign} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
