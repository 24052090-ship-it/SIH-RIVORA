import { useEffect, useState } from 'react';

import PageHeader from '../../../components/layout/PageHeader';
import AlertCard from '../../../components/dashboard/AlertCard';

import { getAlerts } from '../../../services/alertService';
import { alerts as mockAlerts } from '../../../data/mockAlerts';

import './Alerts.css';


export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');


  useEffect(() => {
    let active = true;

    async function loadAlerts() {
      setLoading(true);
      setError('');

      try {
        const data = await getAlerts();

        if (!active) return;

        setAlerts(
          Array.isArray(data)
            ? data
            : mockAlerts,
        );
      } catch (e) {
        if (!active) return;

        setAlerts([]);

        setError(
          e.response?.data?.error
          || e.response?.data?.message
          || 'Unable to load alerts for your area.',
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadAlerts();

    return () => {
      active = false;
    };
  }, []);


  return (
    <div className="animate-in">

      <PageHeader
        eyebrow="Notifications"
        title="Alerts"
        copy="Stay aware of events affecting your route and area."
      />


      {loading && (
        <div className="alert-page-state">
          Loading active alerts...
        </div>
      )}


      {!loading && error && (
        <div className="alert-page-state">
          {error}
        </div>
      )}


      {!loading && !error && alerts.length === 0 && (
        <div className="alert-page-state">
          No active alerts.
        </div>
      )}


      {!loading && !error && alerts.length > 0 && (
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