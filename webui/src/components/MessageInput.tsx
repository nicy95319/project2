import { useState, useRef, KeyboardEvent } from 'react';
import '../styles/MessageInput.css';

const MAX_CHARS = 1000;

interface Props {
  onSend: (text: string) => void;
  disabled: boolean;
}

export default function MessageInput({ onSend, disabled }: Props) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value.slice(0, MAX_CHARS);
    setText(val);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };

  return (
    <form
      className="msg-input-form"
      onSubmit={(e) => { e.preventDefault(); handleSend(); }}
      aria-label="Send message"
    >
      <textarea
        ref={textareaRef}
        className="msg-input-field"
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Type a message… (Enter to send)"
        disabled={disabled}
        rows={1}
        maxLength={MAX_CHARS}
        aria-label="Message text"
      />
      <button
        type="submit"
        className="msg-send-btn"
        disabled={disabled || !text.trim()}
        aria-label="Send message"
        title="Send (Enter)"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      </button>
    </form>
  );
}
