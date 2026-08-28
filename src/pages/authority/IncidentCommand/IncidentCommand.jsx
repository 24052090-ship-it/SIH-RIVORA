import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Radio,
  ShieldAlert,
  Users,
} from 'lucide-react';

import {
  getIncidentOverview,
  updateIncident,
} from '../../../services/incidentService';

import { useRealtime } from '../../../context/RealtimeContext';

import './IncidentCommand.css';


const severityOrder = {
  CRITICAL: 0,
  HIGH: 1,
  WARNING: 2,
  MEDIUM: 3,
  LOW: 4,
};


const emptyData = {
  summary: {
    total: 0,
    critical: 0,
    active: 0,
    avg_risk: 0,
  },
  incidents: [],
  actions: [],
};


/* =========================================================
   INCIDENT COMMAND
   ========================================================= */

export default function IncidentCommand() {
  const { lastEvent } = useRealtime();

  const [data, setData] = useState(emptyData);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);


  /* =========================================================
     LOAD OPERATIONAL INCIDENT DATA
     ========================================================= */

  const load = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }

    try {
      const response = await getIncidentOverview();

      const nextData = {
        ...emptyData,
        ...(response?.data || {}),
        summary: {
          ...emptyData.summary,
          ...(response?.data?.summary || {}),
        },
        incidents: Array.isArray(response?.data?.incidents)
          ? response.data.incidents
          : [],
        actions: Array.isArray(response?.data?.actions)
          ? response.data.actions
          : [],
      };

      setData(nextData);


      /*
       * If an operator currently has an incident selected,
       * update that panel with the latest backend version.
       */
      setSelected((current) => {
        if (!current?.id) {
          return current;
        }

        const refreshed = nextData.incidents.find(
          (incident) =>
            String(incident.id) === String(current.id)
        );

        return refreshed || current;
      });
    } catch (e) {
      console.error(
        'Unable to load incident overview',
        e
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
    load();
  }, [load]);


  /* =========================================================
     REALTIME INCIDENT REFRESH

     These are emitted by the Express backend:

       incidentCreated
       incidentUpdated
       incidentActionCreated

     No browser refresh is needed.
     ========================================================= */

  useEffect(() => {
    if (
      lastEvent?.name === 'incidentCreated' ||
      lastEvent?.name === 'incidentUpdated' ||
      lastEvent?.name === 'incidentActionCreated'
    ) {
      load(false);
    }
  }, [lastEvent, load]);


  /* =========================================================
     FILTER + SEVERITY SORT
     ========================================================= */

  const incidents = useMemo(() => {
    return [...(data.incidents || [])]
      .filter(
        (incident) =>
          filter === 'ALL' ||
          incident.severity === filter
      )
      .sort((a, b) => {
        const severityA =
          severityOrder[a.severity] ?? 99;

        const severityB =
          severityOrder[b.severity] ?? 99;

        if (severityA !== severityB) {
          return severityA - severityB;
        }

        return (
          new Date(b.created_at || 0) -
          new Date(a.created_at || 0)
        );
      });
  }, [data.incidents, filter]);


  /* =========================================================
     SELECTED INCIDENT AUDIT ACTIONS
     ========================================================= */

  const selectedActions = useMemo(() => {
    if (!selected?.id) {
      return [];
    }

    return (data.actions || [])
      .filter(
        (action) =>
          String(action.incident_id) ===
          String(selected.id)
      )
      .sort(
        (a, b) =>
          new Date(a.created_at || 0) -
          new Date(b.created_at || 0)
      );
  }, [data.actions, selected?.id]);


  /* =========================================================
     CHANGE INCIDENT STATUS
     ========================================================= */

  async function changeStatus(id, status) {
    setSaving(true);

    try {
      await updateIncident(id, {
        status,
        note: `Status changed to ${status}`,
        actionType: 'STATUS_UPDATE',
      });

      /*
       * Refresh silently.
       * Socket.IO will also send incidentUpdated, but this
       * gives immediate consistency after the operator action.
       */
      await load(false);
    } catch (e) {
      console.error(
        `Unable to change incident status to ${status}`,
        e
      );
    } finally {
      setSaving(false);
    }
  }


  /* =========================================================
     UI
     ========================================================= */

  return (
    <div className="page incident-page">
      <div className="page-head">
        <div>
          <span className="eyebrow">
            EMERGENCY OPERATIONS
          </span>

          <h1>
            Incident Command
          </h1>

          <p>
            Fuse AI risk, telemetry, reports and GIS
            signals into actionable emergency incidents.
          </p>
        </div>

        <div className="live-chip">
          <Radio size={15} />
          LIVE COMMAND
        </div>
      </div>


      {/* =====================================================
          SUMMARY
          ===================================================== */}

      <div className="incident-stats">
        <div>
          <ShieldAlert />

          <span>
            Critical
          </span>

          <strong>
            {data.summary?.critical || 0}
          </strong>
        </div>


        <div>
          <AlertTriangle />

          <span>
            Active Incidents
          </span>

          <strong>
            {data.summary?.active || 0}
          </strong>
        </div>


        <div>
          <Clock3 />

          <span>
            Average Risk
          </span>

          <strong>
            {data.summary?.avg_risk || 0}%
          </strong>
        </div>


        <div>
          <Users />

          <span>
            Total Incidents
          </span>

          <strong>
            {data.summary?.total || 0}
          </strong>
        </div>
      </div>


      {/* =====================================================
          MAIN COMMAND LAYOUT
          ===================================================== */}

      <div className="incident-layout">

        {/* ===================================================
            PRIORITY QUEUE
            =================================================== */}

        <section className="incident-list card">
          <div className="card-top">
            <div>
              <h2>
                Priority Queue
              </h2>

              <small>
                {loading
                  ? 'Synchronizing operational data'
                  : 'Sorted by severity and recency'}
              </small>
            </div>


            <div className="filters">
              {[
                'ALL',
                'CRITICAL',
                'HIGH',
                'WARNING',
              ].map((item) => (
                <button
                  key={item}
                  className={
                    filter === item
                      ? 'active'
                      : ''
                  }
                  onClick={() =>
                    setFilter(item)
                  }
                >
                  {item}
                </button>
              ))}
            </div>
          </div>


          {incidents.map((incident) => (
            <button
              className={
                `incident-row ${
                  incident.severity?.toLowerCase() ||
                  ''
                }`
              }
              key={incident.id}
              onClick={() =>
                setSelected(incident)
              }
            >
              <div className="severity-dot" />


              <div className="incident-main">
                <strong>
                  {incident.incident_code}
                  {' · '}
                  {incident.title}
                </strong>

                <span>
                  {incident.zone_name || 'Unzoned'}
                  {' · '}
                  {incident.assigned_team ||
                    'Unassigned'}
                </span>
              </div>


              <div className="incident-meta">
                <b>
                  {incident.risk_score}%
                </b>

                <span>
                  {incident.status}
                </span>
              </div>
            </button>
          ))}


          {!incidents.length && (
            <div className="empty">
              No incidents match this filter.
            </div>
          )}
        </section>


        {/* ===================================================
            INCIDENT DETAIL
            =================================================== */}

        <section className="incident-detail card">
          {selected ? (
            <>
              <div className="detail-head">
                <div>
                  <span
                    className={
                      `severity-badge ${
                        selected.severity?.toLowerCase() ||
                        ''
                      }`
                    }
                  >
                    {selected.severity}
                  </span>

                  <h2>
                    {selected.title}
                  </h2>

                  <p>
                    {selected.incident_code}
                    {' · '}
                    {selected.zone_name ||
                      'Unzoned'}
                  </p>
                </div>


                <strong className="risk-number">
                  {selected.risk_score}%
                </strong>
              </div>


              {/* =============================================
                  CORE INCIDENT INFORMATION
                  ============================================= */}

              <div className="detail-grid">
                <div>
                  <small>
                    Flood probability
                  </small>

                  <strong>
                    {selected.flood_probability != null
                      ? `${Math.round(
                          Number(
                            selected.flood_probability
                          ) * 100
                        )}%`
                      : '-'}
                  </strong>
                </div>


                <div>
                  <small>
                    Assigned team
                  </small>

                  <strong>
                    {selected.assigned_team ||
                      'Unassigned'}
                  </strong>
                </div>


                <div>
                  <small>
                    SLA
                  </small>

                  <strong>
                    {selected.sla_minutes} min
                  </strong>
                </div>


                <div>
                  <small>
                    Status
                  </small>

                  <strong>
                    {selected.status}
                  </strong>
                </div>
              </div>


              {/* =============================================
                  SIGNAL FUSION
                  ============================================= */}

              <div className="source-box">
                <h3>
                  Signal Fusion
                </h3>

                {Object.entries(
                  selected.source_summary || {}
                ).map(([key, value]) => (
                  <div key={key}>
                    <span>
                      {key.replaceAll('_', ' ')}
                    </span>

                    <b>
                      {typeof value === 'object'
                        ? JSON.stringify(value)
                        : String(value)}
                    </b>
                  </div>
                ))}
              </div>


              {/* =============================================
                  RECOMMENDED RESPONSE
                  ============================================= */}

              <div className="actions-box">
                <h3>
                  Recommended response
                </h3>

                {(
                  selected.recommended_actions ||
                  []
                ).map((action, index) => (
                  <div
                    key={`${action}-${index}`}
                  >
                    <CheckCircle2 size={15} />

                    <span>
                      {action}
                    </span>
                  </div>
                ))}
              </div>


              {/* =============================================
                  AUDIT TIMELINE
                  ============================================= */}

              {selectedActions.length > 0 && (
                <div className="source-box">
                  <h3>
                    Incident timeline
                  </h3>

                  {selectedActions.map(
                    (action) => (
                      <div key={action.id}>
                        <span>
                          {action.action_type}
                        </span>

                        <b>
                          {action.note ||
                            action.actor_name ||
                            'Recorded'}
                        </b>
                      </div>
                    )
                  )}
                </div>
              )}


              {/* =============================================
                  COMMAND ACTIONS
                  ============================================= */}

              <div className="command-actions">

                {selected.status === 'OPEN' && (
                  <button
                    onClick={() =>
                      changeStatus(
                        selected.id,
                        'ACKNOWLEDGED'
                      )
                    }
                    disabled={saving}
                  >
                    Acknowledge
                  </button>
                )}


                {selected.status ===
                  'ACKNOWLEDGED' && (
                  <button
                    onClick={() =>
                      changeStatus(
                        selected.id,
                        'DISPATCHED'
                      )
                    }
                    disabled={saving}
                  >
                    Dispatch Crew
                  </button>
                )}


                {selected.status ===
                  'DISPATCHED' && (
                  <button
                    onClick={() =>
                      changeStatus(
                        selected.id,
                        'CONTAINED'
                      )
                    }
                    disabled={saving}
                  >
                    Mark Contained
                  </button>
                )}


                {selected.status ===
                  'CONTAINED' && (
                  <button
                    onClick={() =>
                      changeStatus(
                        selected.id,
                        'RESOLVED'
                      )
                    }
                    disabled={saving}
                  >
                    Mark Resolved
                  </button>
                )}

              </div>
            </>
          ) : (
            <div className="empty-detail">
              <ShieldAlert size={36} />

              <h2>
                Select an incident
              </h2>

              <p>
                Choose a priority incident to inspect
                signals and execute the recommended
                response.
              </p>
            </div>
          )}
        </section>

      </div>
    </div>
  );
}