import { io, Socket } from 'socket.io-client';

// Ensure this matches your backend URL
const SOCKET_URL = import.meta.env.VITE_API_URL; 

class SocketService {
  private socket: Socket | null = null;

  connect() {
    if (this.socket) return;

    const token = sessionStorage.getItem('token');
    
    this.socket = io(SOCKET_URL, {
      transports: ['websocket'],
      autoConnect: true,
      auth: {
        token
      }
    });

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id);
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  emit(event: string, data: any) {
    if (!this.socket) this.connect();
    this.socket?.emit(event, data);
  }

  on(event: string, callback: (data: any) => void) {
    if (!this.socket) this.connect();
    this.socket?.on(event, callback);
  }

  off(event: string) {
    this.socket?.off(event);
  }

  joinRoom(room: string) {
    this.emit('join', room);
  }

  leaveRoom(room: string) {
    this.emit('leave', room);
  }
}

export const socketService = new SocketService();
