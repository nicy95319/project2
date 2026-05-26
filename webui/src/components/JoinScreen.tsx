import { useState, FormEvent } from 'react';
import '../styles/JoinScreen.css';
import { ConnectionStatus } from '../types';

const CALLSIGN_RE = /^[a-zA-Z0-9_]{1,20}$/;

interface Props {
  onJoin: (callsign: string) => void;
  status: ConnectionStatus | null;
  connError: string;
}

function validate(value: string): string {
  if (!value.trim()) return 'Callsign is required.';
  if (!CALLSIGN_RE.test(value.trim())) return 'Use 1–20 letters, numbers, or underscores.';
  return '';
}

export default function JoinScreen({ onJoin, status, connError }: Props) {
  const [callsign, setCallsign] = useState('');
  const [fieldError, setFieldError] = useState('');

  const joining = status === 'connecting';

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const err = validate(callsign);
    if (err) { setFieldError(err); return; }
    setFieldError('');
    onJoin(callsign.trim());
  };

  return (
    <div className="join-screen">
      <div className="join-card">
        <div className="join-header">
          <div className="join-logo" aria-hidden="true">💬</div>
          <h1 className="join-title">ChatRoom</h1>
          <p className="join-subtitle">Anonymous real-time chat. No account needed.</p>
        </div>

        <form className="join-form" onSubmit={handleSubmit} noValidate>
          <div className="field-group">
            <label className="field-label" htmlFor="callsign">Your callsign</label>
            <input
              id="callsign"
              className={`field-input${fieldError ? ' error' : ''}`}
              type="text"
              value={callsign}
              onChange={(e) => {
                setCallsign(e.target.value);
                if (fieldError) setFieldError(validate(e.target.value));
              }}
              placeholder="CoolDog"
              maxLength={20}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              disabled={joining}
              aria-invalid={!!fieldError}
              aria-describedby={fieldError ? 'callsign-error' : undefined}
            />
            {fieldError && (
              <span id="callsign-error" className="field-error" role="alert">
                {fieldError}
              </span>
            )}
          </div>

          {connError && (
            <div className="join-conn-error" role="alert">
              <span className="join-conn-error-icon">⚠</span>
              <span>{connError}</span>
            </div>
          )}

          <button type="submit" className="join-btn" disabled={joining}>
            {joining ? 'Connecting…' : 'Join Chat'}
          </button>
        </form>
      </div>
    </div>
  );
}
