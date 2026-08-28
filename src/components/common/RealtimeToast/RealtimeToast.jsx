import React from 'react';
import { Bell, Radio, ShieldAlert } from 'lucide-react';
import { useRealtime } from '../../../context/RealtimeContext';
import './RealtimeToast.css';

export default function RealtimeToast() {
  const { lastEvent, enabled } = useRealtime() || {};
  if (!enabled || !lastEvent || lastEvent.name === 'connectionStatus') return null;
  const p = lastEvent.payload || {};
  const title = lastEvent.name === 'newAlert' ? 'New emergency alert' : lastEvent.name === 'riskUpdated' ? 'Flood risk updated' : lastEvent.name === 'sensorUpdated' ? 'Sensor updated' : lastEvent.name === 'newReport' ? 'New citizen report' : 'Live system update';
  return <div className="realtime-toast"><div className="realtime-toast-icon">{lastEvent.name === 'newAlert' ? <ShieldAlert size={18}/> : lastEvent.name === 'sensorUpdated' ? <Radio size={18}/> : <Bell size={18}/>}</div><div><strong>{title}</strong><span>{p.alert?.message || p.risk?.level || p.sensor?.id || p.report?.id || 'AquaGuard received a live update.'}</span></div></div>;
}
