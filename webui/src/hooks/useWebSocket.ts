import { useRef, useCallback } from 'react';
import { ServerMessage, ConnectionStatus } from '../types';
import { WS_ENDPOINT } from '../config';

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 2000;
const MAX_DELAY_MS = 30000;

interface UseWebSocketReturn {
  connect: (callsign: string) => void;
  send: (text: string) => void;
  disconnect: () => void;
  reconnect: () => void;
}

export function useWebSocket(
  onMessage: (msg: ServerMessage) => void,
  onStatusChange: (status: ConnectionStatus) => void,
): UseWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const callsignRef = useRef('');
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef(false);
  const onMessageRef = useRef(onMessage);
  const onStatusRef = useRef(onStatusChange);
  onMessageRef.current = onMessage;
  onStatusRef.current = onStatusChange;

  const clearTimer = () => {
    if (retryTimerRef.current !== null) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  };

  const connectInternal = useCallback(() => {
    if (!activeRef.current) return;

    const status: ConnectionStatus =
      retryCountRef.current === 0 ? 'connecting' : 'reconnecting';
    onStatusRef.current(status);

    const url = `${WS_ENDPOINT}?callsign=${encodeURIComponent(callsignRef.current)}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!activeRef.current) { ws.close(); return; }
      retryCountRef.current = 0;
      onStatusRef.current('connected');
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as ServerMessage;
        onMessageRef.current(data);
      } catch {
        // malformed server message — ignore
      }
    };

    ws.onclose = () => {
      if (!activeRef.current) return;
      onStatusRef.current('disconnected');

      if (retryCountRef.current < MAX_RETRIES) {
        const delay = Math.min(
          BASE_DELAY_MS * Math.pow(2, retryCountRef.current),
          MAX_DELAY_MS,
        );
        retryCountRef.current++;
        retryTimerRef.current = setTimeout(connectInternal, delay);
      } else {
        onStatusRef.current('failed');
      }
    };

    ws.onerror = () => {
      // ws.onclose fires after onerror — retries handled there
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const connect = useCallback((callsign: string) => {
    callsignRef.current = callsign;
    activeRef.current = true;
    retryCountRef.current = 0;
    connectInternal();
  }, [connectInternal]);

  const send = useCallback((text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'sendMessage', text }));
    }
  }, []);

  const disconnect = useCallback(() => {
    activeRef.current = false;
    clearTimer();
    wsRef.current?.close();
    wsRef.current = null;
  }, []);

  const reconnect = useCallback(() => {
    clearTimer();
    wsRef.current?.close();
    wsRef.current = null;
    retryCountRef.current = 0;
    activeRef.current = true;
    connectInternal();
  }, [connectInternal]);

  return { connect, send, disconnect, reconnect };
}
