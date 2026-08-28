// Socket.IO is intentionally not faked in Version 1.
// Version 2 will inject a real Socket.IO client here and emit these events to the UI.
export const REALTIME_EVENTS = Object.freeze([
  'newReport',
  'riskUpdated',
  'newAlert',
  'maintenanceAssigned',
  'maintenanceUpdated',
  'sensorUpdated'
]);

export function createRealtimeAdapter(){
  return {
    enabled:false,
    events:REALTIME_EVENTS,
    connect(){ throw new Error('Realtime gateway is not enabled in AquaGuard Version 1. Configure Socket.IO in Version 2.'); },
    disconnect(){},
  };
}
