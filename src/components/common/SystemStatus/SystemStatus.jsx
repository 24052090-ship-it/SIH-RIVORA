import { useState, useEffect } from 'react';
import { Activity, CheckCircle2, Clock3, Database, Radio, Server } from 'lucide-react';
import { getSystemHealth } from '../../../services/systemService';
import './SystemStatus.css';

const icons = {
  'Express API': Server,
  'PostgreSQL / PostGIS': Database,
  'AI Risk Engine': Activity,
  'Sensor Network': Radio,
  'Realtime Gateway': Clock3,
  'Map Provider': CheckCircle2,
  'Satellite Provider': CheckCircle2,
  'Weather Provider': Activity
};

export default function SystemStatus() {
  const [providers, setProviders] = useState([]);

  useEffect(() => {
    let mounted = true;
    async function fetchHealth() {
      try {
        const data = await getSystemHealth();
        if (mounted && data.providers) {
          setProviders(data.providers);
        }
      } catch (err) {
        console.error('Failed to fetch system health', err);
      }
    }
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  if (!providers.length) return null;

  return (
    <div className="system-status">
      {providers.map(item => {
        const Icon = icons[item.name] || Activity;
        return (
          <div className="system-status-row" key={item.name}>
            <span className={`status-dot ${item.status === 'ONLINE' ? 'online' : item.status === 'DEGRADED' || item.status === 'STANDBY' ? 'standby' : 'ready'}`} />
            <Icon size={15} />
            <span className="system-name">{item.name}</span>
            <span className="system-latency">{item.latency}</span>
            <b>{item.status}</b>
          </div>
        );
      })}
    </div>
  );
}
