import { useEffect, useState, useRef } from "react";

export type ConnectionStatus = "connecting" | "connected" | "disconnected";

interface UseWebSocketProps {
  role: "admin" | "student";
  studentId?: string;
  onMessage: (event: string, data: any) => void;
}

export function useWebSocket({ role, studentId, onMessage }: UseWebSocketProps) {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);
  const onMessageRef = useRef(onMessage);

  // Keep callback up-to-date to avoid effect re-triggering
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    let active = true;

    function connect() {
      if (socketRef.current) {
        try { socketRef.current.close(); } catch (_) {}
      }

      setStatus("connecting");
      
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}`;
      console.log(`[WS Client] Connecting to ${wsUrl}`);
      
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        if (!active) {
          try { ws.close(); } catch (_) {}
          return;
        }
        console.log("[WS Client] Connection established");
        setStatus("connected");
        
        // Register client role
        try {
          ws.send(JSON.stringify({
            event: "register",
            data: { role, studentId }
          }));
        } catch (err) {
          console.error("[WS Client] Registration send failed:", err);
        }
      };

      ws.onmessage = (event) => {
        if (!active) return;
        try {
          const msg = JSON.parse(event.data);
          
          if (msg.event === "pong") return; // Internal ping-pong keepalive
          
          onMessageRef.current(msg.event, msg.data);
        } catch (err) {
          console.error("[WS Client] Failed to parse message:", err);
        }
      };

      ws.onclose = () => {
        if (!active) return;
        console.log("[WS Client] Connection lost");
        setStatus("disconnected");
        
        // Schedule reconnect
        reconnectTimeoutRef.current = setTimeout(() => {
          if (active) connect();
        }, 3000);
      };

      ws.onerror = (err) => {
        console.error("[WS Client] Socket error:", err);
        try { ws.close(); } catch (_) {}
      };
    }

    connect();

    return () => {
      active = false;
      if (socketRef.current) {
        try { socketRef.current.close(); } catch (_) {}
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [role, studentId]);

  return status;
}
