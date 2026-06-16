import { io } from 'socket.io-client';

console.log('Attempting to connect to Socket.IO server at http://localhost:5000...');

const socket = io('http://localhost:5000', {
  transports: ['websocket', 'polling'],
  autoConnect: true,
});

socket.on('connect', () => {
  console.log('Successfully connected to Socket.IO server!');
  console.log('Socket ID:', socket.id);
  socket.disconnect();
  process.exit(0);
});

socket.on('connect_error', (error) => {
  console.error('Socket connection error:', error.message);
  process.exit(1);
});

// Timeout after 5 seconds
setTimeout(() => {
  console.error('Connection timed out after 5 seconds.');
  process.exit(1);
}, 5000);
