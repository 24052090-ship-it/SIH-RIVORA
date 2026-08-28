import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import PageHeader from '../../../components/layout/PageHeader';
import AlertCard from '../../../components/dashboard/AlertCard';

import { alerts as mockAlerts } from '../../../data/mockAlerts';
import { getAlerts } from '../../../services/alertService';
import { useRealtime } from '../../../context/RealtimeContext';

import './Alerts.css';


export default function Alerts() {
  const { lastEvent } = useRealtime();

  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');


  /* =========================================================
     LOAD ALERTS
     ========================================================= */

  const loadAlerts = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }

    setError('');

    try {
      const data = await getAlerts();

      setAlerts(
        Array.isArray(data)
          ? data
          : mockAlerts
      );
    } catch (e) {
      setAlerts([]);

      setError(
        e.response?.data?.error ||
        e.response?.data?.message ||
        'Unable to load operational alerts.'
      );
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, []);


  /* =========================================================
     INITIAL LOAD
     ========================================================= */

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);


  /* =========================================================
     REALTIME ALERT REFRESH

     Backend events:
       alertCreated
       newAlert

     A realtime refresh does not show the full-page loading
     state, so the page updates without visually flashing.
     ========================================================= */

  useEffect(() => {
    if (
      lastEvent?.name === 'alertCreated' ||
      lastEvent?.name === 'newAlert'
    ) {
      loadAlerts(false);
    }
  }, [lastEvent, loadAlerts]);


  /* =========================================================
     UI
     ========================================================= */

  return (
    <div className="animate-in">
      <PageHeader
        eyebrow="Incident orchestration"
        title="Alerts"
        copy="Severity-aware notifications for command operators."
      />


      {loading && (
        <div className="alert-page-state">
          Synchronizing active alerts...
        </div>
      )}


      {!loading && error && (
        <div className="alert-page-state">
          {error}
        </div>
      )}


      {!loading &&
        !error &&
        alerts.length === 0 && (
          <div className="alert-page-state">
            No active alerts.
          </div>
        )}


      {!loading &&
        !error &&
        alerts.length > 0 && (
          <div className="alert-page-list">
            {alerts.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
              />
            ))}
          </div>
        )}
    </div>
  );
}