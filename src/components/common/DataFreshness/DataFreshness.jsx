import { RefreshCw } from 'lucide-react';
import useDataFreshness from '../../../hooks/useDataFreshness';
import './DataFreshness.css';
export default function DataFreshness({ timestamp = null }) {
  const { label, stale, status } = useDataFreshness(timestamp);
  return (
    <span className={`data-freshness ${stale ? 'stale' : ''} ${status?.toLowerCase()}`}>
      <RefreshCw size={11} />{label}
    </span>
  );
}
