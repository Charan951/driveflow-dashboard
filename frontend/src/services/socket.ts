import { io, Socket } from 'socket.io-client';

// Ensure this matches your backend URL
const SOCKET_URL = import.meta.env.VITE_API_URL; 

class SocketService {
  private socket: Socket | null = null;
  private currentRooms: Set<string> = new Set();
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private globalListeners: Set<(data: any) => void> = new Set();

  connect() {
    const token = sessionStorage.getItem('token');
    if (this.socket) {
      const currentToken = (this.socket as any).auth?.token;
      if (currentToken !== token) {
        // Token has changed (e.g. login or logout) - reconnect with new token
        this.socket.disconnect();
        (this.socket as any).auth = { token };
        this.socket.connect();
      } else if (!this.socket.connected) {
        this.socket.connect();
      }
      return;
    }

    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      auth: {
        token
      },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      // Keep auth token in sync on reconnect
      const latestToken = sessionStorage.getItem('token');
      (this.socket as any).auth = { token: latestToken };
      
      // Rejoin all currently tracked rooms
      this.currentRooms.forEach((room) => {
        this.socket?.emit('join', room);
      });
    });

    this.socket.on('disconnect', () => {
    });

    // Disconnect socket when page unloads to allow back/forward cache
    window.addEventListener('beforeunload', this.handleBeforeUnload);
    window.addEventListener('pagehide', this.handleBeforeUnload);
  }

  private handleBeforeUnload = () => {
    this.disconnect();
  };

  disconnect() {
    if (this.socket) {
      window.removeEventListener('beforeunload', this.handleBeforeUnload);
      window.removeEventListener('pagehide', this.handleBeforeUnload);
      this.socket.disconnect();
      this.socket = null;
      this.currentRooms.clear();
      this.listeners.clear();
      this.globalListeners.clear();
    }
  }

  isConnected() {
    return this.socket?.connected || false;
  }

  emit(event: string, data: unknown) {
    if (!this.socket?.connected) this.connect();
    this.socket?.emit(event, data);
  }

  on(event: string, callback: (data: any) => void) {
    if (!this.socket) this.connect();
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    this.socket?.on(event, callback);
  }

  onGlobal(event: string, callback: (data: any) => void) {
    this.globalListeners.add(callback);
    this.on(event, callback);
  }

  off(event: string, callback?: (data: any) => void) {
    if (!this.socket) return;
    if (callback) {
      this.listeners.get(event)?.delete(callback);
      this.globalListeners.delete(callback);
      this.socket.off(event, callback);
    } else {
      // If no callback is specified, only remove non-global listeners
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        for (const cb of Array.from(callbacks)) {
          if (!this.globalListeners.has(cb)) {
            this.socket.off(event, cb);
            callbacks.delete(cb);
          }
        }
      }
    }
  }

  offGlobal(event: string, callback: (data: any) => void) {
    if (!this.socket) return;
    this.globalListeners.delete(callback);
    this.off(event, callback);
  }

  onAny(callback: (event: string, data: unknown) => void) {
    if (!this.socket) this.connect();
    const socket = this.socket as Socket & {
      onAny?: (cb: (event: string, ...args: unknown[]) => void) => void;
      offAny?: (cb?: (event: string, ...args: unknown[]) => void) => void;
    };
    socket.onAny?.((event, ...args) => {
      callback(event, args[0]);
    });
  }

  offAny(callback?: (event: string, data: unknown) => void) {
    const socket = this.socket as Socket & {
      offAny?: (cb?: (event: string, ...args: unknown[]) => void) => void;
    };
    if (!callback) {
      socket?.offAny?.();
      return;
    }
    socket?.offAny?.((event, ...args) => {
      callback(event, args[0]);
    });
  }

  joinRoom(room: string) {
    this.currentRooms.add(room);
    this.emit('join', room);
  }

  leaveRoom(room: string) {
    this.currentRooms.delete(room);
    this.emit('leave', room);
  }
}

export const socketService = new SocketService();
