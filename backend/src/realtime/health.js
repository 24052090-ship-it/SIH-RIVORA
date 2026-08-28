export function realtimeHealth(io) {
  return { enabled: Boolean(io), connectedClients: io ? io.engine.clientsCount : 0 };
}
