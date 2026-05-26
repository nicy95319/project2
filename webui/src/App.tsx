import { useState, useCallback, useRef } from 'react';
import JoinScreen from './components/JoinScreen';
import ChatScreen from './components/ChatScreen';
import { useWebSocket } from './hooks/useWebSocket';
import { ConnectionStatus, ServerMessage } from './types';

type Screen = 'join' | 'chat';

export default function App() {
  const [screen, setScreen] = useState<Screen>('join');
  const [callsign, setCallsign] = useState('');
  const [messages, setMessages] = useState<ServerMessage[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [connError, setConnError] = useState('');
  const screenRef = useRef<Screen>('join');

  const handleMessage = useCallback((msg: ServerMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const handleStatusChange = useCallback((newStatus: ConnectionStatus) => {
    setStatus(newStatus);
    if (newStatus === 'connected' && screenRef.current === 'join') {
      screenRef.current = 'chat';
      setScreen('chat');
      setConnError('');
    }
    if (
      (newStatus === 'disconnected' || newStatus === 'failed') &&
      screenRef.current === 'join'
    ) {
      setConnError('Could not connect to the server. Please try again.');
    }
  }, []);

  const { connect, send, disconnect, reconnect } = useWebSocket(
    handleMessage,
    handleStatusChange,
  );

  const handleJoin = useCallback((cs: string) => {
    setCallsign(cs);
    setMessages([]);
    setConnError('');
    connect(cs);
  }, [connect]);

  const handleLeave = useCallback(() => {
    disconnect();
    screenRef.current = 'join';
    setScreen('join');
    setStatus('disconnected');
    setMessages([]);
    setConnError('');
  }, [disconnect]);

  if (screen === 'chat') {
    return (
      <ChatScreen
        callsign={callsign}
        messages={messages}
        status={status}
        onSend={send}
        onReconnect={reconnect}
        onLeave={handleLeave}
      />
    );
  }

  return (
    <JoinScreen
      onJoin={handleJoin}
      status={status === 'connecting' ? status : null}
      connError={connError}
    />
  );
}
