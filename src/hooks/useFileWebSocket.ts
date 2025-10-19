// src/hooks/useFileWebSocket.ts

import { useEffect, useRef, useCallback } from 'react';
import { WebSocketMessage } from '@/types/files';

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';

interface UseFileWebSocketOptions {
  onFileUpdate?: (fileId: string, data: any) => void;
  onBulkUpdate?: (updates: any[]) => void;
  enabled?: boolean;
}

export function useFileWebSocket(options: UseFileWebSocketOptions = {}) {
  const { onFileUpdate, onBulkUpdate, enabled = true } = options;
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const heartbeatIntervalRef = useRef<NodeJS.Timeout>();

  const connect = useCallback(() => {
    if (!enabled) return;

    // Get auth token from Supabase session
    const keys = Object.keys(localStorage);
    const supabaseKey = keys.find(key => key.startsWith('sb-') && key.includes('-auth-token'));

    if (!supabaseKey) {
      console.warn('No auth token found, WebSocket not connected');
      return;
    }

    const sessionData = localStorage.getItem(supabaseKey);
    if (!sessionData) {
      console.warn('No session data found, WebSocket not connected');
      return;
    }

    let token;
    try {
      const parsed = JSON.parse(sessionData);
      token = parsed.access_token;
    } catch (e) {
      console.warn('Failed to parse session data:', e);
      return;
    }

    if (!token) {
      console.warn('No access token in session, WebSocket not connected');
      return;
    }

    try {
      const ws = new WebSocket(`${WS_BASE_URL}/ws/files?token=${token}`);
      
      ws.onopen = () => {
        console.log('✓ WebSocket connected');
        wsRef.current = ws;

        // Start heartbeat (ping every 30 seconds)
        heartbeatIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send('ping');
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);

          if (message.type === 'file_update' && message.file_id && message.data) {
            onFileUpdate?.(message.file_id, message.data);
          } else if (message.type === 'bulk_update' && message.updates) {
            onBulkUpdate?.(message.updates);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        wsRef.current = null;

        // Clear heartbeat
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }

        // Attempt to reconnect after 3 seconds
        if (enabled) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('Attempting to reconnect WebSocket...');
            connect();
          }, 3000);
        }
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  }, [enabled, onFileUpdate, onBulkUpdate]);

  const disconnect = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
    reconnect: connect
  };
}
