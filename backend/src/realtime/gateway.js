import { Server } from 'socket.io';
import { env } from '../config/env.js';

export function createRealtimeGateway(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: env.corsOrigin, methods: ['GET', 'POST'] },
    transports: ['websocket', 'polling']
  });

  io.on('connection', (socket) => {
    socket.emit('connectionStatus', { connected: true, socketId: socket.id, serverTime: new Date().toISOString() });
    socket.on('subscribe', (channel) => {
      const allowed = ['city', 'citizen', 'authority'];
      if (allowed.includes(channel)) socket.join(channel);
    });
    socket.on('unsubscribe', (channel) => socket.leave(channel));
  });

  return io;
}

export function emitRealtime(io, event, payload, rooms = ['city']) {
  if (!io) return;
  rooms.forEach((room) => io.to(room).emit(event, { ...payload, emittedAt: new Date().toISOString() }));
}
