import { useEffect, useState } from 'react';
import { getSystemHealth } from '../services/systemService';

export default function useDataFreshness(timestamp = null) {
  const [globalTimestamp, setGlobalTimestamp] = useState(null);
  const [age, setAge] = useState(0);
  const [status, setStatus] = useState('OFFLINE');

  // Fetch global health timestamp if no timestamp is provided
  useEffect(() => {
    if (timestamp) return;
    let mounted = true;
    async function fetchTS() {
      try {
        const data = await getSystemHealth();
        if (mounted && data.timestamp) {
          // You might prefer to fetch telemetry specific timestamp, but here we can just use the server time or a specific freshness metric
          // Actually, let's find the Sensor Network status from the health data
          const sensorNetwork = data.providers?.find(p => p.name === 'Sensor Network');
          if (sensorNetwork && sensorNetwork.status) {
            setStatus(sensorNetwork.status);
          }
          setGlobalTimestamp(data.timestamp);
        }
      } catch (err) {}
    }
    fetchTS();
    const timer = setInterval(fetchTS, 15000);
    return () => { mounted = false; clearInterval(timer); };
  }, [timestamp]);

  const activeTimestamp = timestamp || globalTimestamp;

  useEffect(() => {
    if (!activeTimestamp) { setAge(0); return; }
    const computeAge = () => {
      const ms = Date.now() - new Date(activeTimestamp).getTime();
      setAge(Math.max(0, Math.floor(ms / 1000)));
    };
    computeAge();
    const timer = setInterval(computeAge, 1000);
    return () => clearInterval(timer);
  }, [activeTimestamp]);

  let displayStatus = status;
  if (timestamp) {
    if (age < 60) displayStatus = 'ONLINE';
    else if (age <= 180) displayStatus = 'DEGRADED';
    else displayStatus = 'OFFLINE';
  }

  const label = activeTimestamp 
    ? (displayStatus === 'ONLINE' ? `Updated ${age}s ago` : displayStatus === 'DEGRADED' ? `Delayed · ${age}s old` : `Stale · ${age}s old`)
    : 'No data';

  return { age, label, stale: displayStatus !== 'ONLINE', status: displayStatus };
}
