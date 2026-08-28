import React from 'react';
import { Radio } from 'lucide-react';
import { useRealtime } from '../../../context/RealtimeContext';
import './RealtimeStatus.css';

export default function RealtimeStatus() {
  const { enabled, status } = useRealtime() || {};
  const label = !enabled ? 'REALTIME OFF' : status === 'connected' ? 'LIVE' : status === 'connecting' ? 'CONNECTING' : 'OFFLINE';
  return <div className={`realtime-status ${status || 'disabled'}`}><span className="realtime-dot"/><Radio size={14}/><span>{label}</span></div>;
}
