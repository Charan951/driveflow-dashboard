import { io, Socket } from 'socket.io-client';

// Ensure this matches your backend URL
const SOCKET_URL = import.meta.env.VITE_API_URL; 

class SocketService {
  private socket: Socket | null = null;
  private currentRoom: string | null = null;

  connect() {
    if (this.socket?.connected) return;

    if (this.socket) {
      this.socket.connect();
      return;
    }

    const token = sessionStorage.getItem('token');
    
    this.socket = io(SOCKET_URL, {
      transports: ['websocket'],
      autoConnect: true,
      auth: {
        token
      },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      if (this.currentRoom) {
        this.socket?.emit('join', this.currentRoom);
      }
    });

    this.socket.on('disconnect', () => {
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.currentRoom = null;
    }
  }

  isConnected() {
    return this.socket?.connected || false;
  }

  emit(event: string, data: unknown) {
    if (!this.socket?.connected) this.connect();
    this.socket?.emit(event, data);
  }

  on(event: string, callback: (data: unknown) => void) {
    if (!this.socket) this.connect();
    this.socket?.on(event, callback);
  }

  off(event: string, callback?: (data: unknown) => void) {
    if (!this.socket) return;
    if (callback) {
      this.socket.off(event, callback);
    } else {
      this.socket.off(event);
    }
  }

  joinRoom(room: string) {
    this.currentRoom = room;
    this.emit('join', room);
  }

  leaveRoom(room: string) {
    if (this.currentRoom === room) {
      this.currentRoom = null;
    }
    this.emit('leave', room);
  }
}

export const socketService = new SocketService();
