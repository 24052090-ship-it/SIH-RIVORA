export const currentRisk = {
  zone:'Zone 4', level:'CRITICAL', score:91, probability:0.91,
  factors:[
    { label:'Rainfall intensity', value:92, tone:'danger' },
    { label:'Drain occupancy', value:87, tone:'warning' },
    { label:'Blocked drainage', value:83, tone:'danger' },
    { label:'Elevation exposure', value:76, tone:'warning' },
    { label:'Historical incidents', value:81, tone:'info' }
  ],
  updatedAt:'8 seconds ago'
};

export const simulationDefaults = { rainfall:72, drainCapacity:65, blockedDrains:18, duration:3 };
