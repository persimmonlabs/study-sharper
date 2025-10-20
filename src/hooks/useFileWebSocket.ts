// src/hooks/useFileWebSocket.ts

import { useEffect, useRef, useCallback } from 'react';
import { WebSocketMessage } from '@/types/files';
import { supabase } from '@/lib/supabase';

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || 'wss://study-sharper-backend.onrender.com';

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

  const connect = useCallback(async () => {
    if (!enabled) return;

    // Get auth token from Supabase
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session?.access_token) {
      console.warn('[WebSocket] No auth token found, WebSocket not connected');
      return;
    }

    const token = session.access_token;

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
        // Handle heartbeat pong response
        if (event.data === 'pong') {
          return; // Ignore pong messages
        }

        try {
          const message: WebSocketMessage = JSON.parse(event.data);

          if (message.type === 'file_update' && message.file_id && message.data) {
            onFileUpdate?.(message.file_id, message.data);
          } else if (message.type === 'bulk_update' && message.updates) {
            onBulkUpdate?.(message.updates);
          }
        } catch (error) {
          console.error('[WebSocket] Failed to parse message:', error, 'Data:', event.data);
        }
      };

      ws.onerror = (error) => {
        console.warn('[WebSocket] Connection error (non-critical):', error);
        // Don't log as error - WebSocket is optional for file updates
      };

      ws.onclose = () => {
        console.log('[WebSocket] Disconnected (non-critical - polling will continue)');
        wsRef.current = null;

        // Clear heartbeat
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }

        // Don't auto-reconnect - WebSocket is optional
        // Files page will work fine with polling alone
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
