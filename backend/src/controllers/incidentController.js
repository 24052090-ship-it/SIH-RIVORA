import { query } from '../db/pool.js';


const allowedStatus = [
  'OPEN',
  'ACKNOWLEDGED',
  'DISPATCHED',
  'CONTAINED',
  'RESOLVED',
  'CLOSED',
];


/* =========================================================
   INCIDENT OVERVIEW
   ========================================================= */

export async function incidentOverview(req, res, next) {
  try {
    const summary = await query(`
      SELECT
        COUNT(*)::int AS total,

        COUNT(*) FILTER (
          WHERE severity = 'CRITICAL'
          AND status NOT IN ('RESOLVED', 'CLOSED')
        )::int AS critical,

        COUNT(*) FILTER (
          WHERE status NOT IN ('RESOLVED', 'CLOSED')
        )::int AS active,

        COALESCE(
          ROUND(
            AVG(risk_score) FILTER (
              WHERE status NOT IN ('RESOLVED', 'CLOSED')
            )
          ),
          0
        )::int AS avg_risk

      FROM incidents
    `);


    const incidents = await query(`
      SELECT
        id,
        incident_code,
        title,
        zone_name,
        severity,
        status,
        risk_score,
        flood_probability,
        source_summary,
        recommended_actions,
        assigned_team,
        sla_minutes,
        acknowledged_at,
        resolved_at,
        created_at,
        updated_at,

        CASE
          WHEN location IS NULL THEN NULL
          ELSE ST_Y(location::geometry)
        END AS latitude,

        CASE
          WHEN location IS NULL THEN NULL
          ELSE ST_X(location::geometry)
        END AS longitude

      FROM incidents

      ORDER BY
        CASE severity
          WHEN 'CRITICAL' THEN 1
          WHEN 'HIGH' THEN 2
          WHEN 'WARNING' THEN 3
          WHEN 'MEDIUM' THEN 4
          WHEN 'LOW' THEN 5
          ELSE 6
        END,
        created_at DESC
    `);


    const actions = await query(`
      SELECT
        ia.id,
        ia.incident_id,
        ia.action_type,
        ia.note,
        ia.created_at,
        u.name AS actor_name

      FROM incident_actions ia

      LEFT JOIN users u
        ON u.id = ia.actor_id

      ORDER BY ia.created_at DESC

      LIMIT 100
    `);


    return res.json({
      generatedAt: new Date().toISOString(),
      summary: summary.rows[0],
      incidents: incidents.rows,
      actions: actions.rows,
    });
  } catch (e) {
    next(e);
  }
}


/* =========================================================
   CREATE INCIDENT
   ========================================================= */

export async function createIncident(req, res, next) {
  try {
    const {
      title,
      zoneName,
      longitude,
      latitude,
      severity = 'WARNING',
      riskScore = 0,
      floodProbability = null,
      sourceSummary = {},
      recommendedActions = [],
      assignedTeam = null,
      slaMinutes = 60,
    } = req.body || {};


    if (!title || !severity) {
      return res.status(400).json({
        message: 'title and severity are required',
      });
    }


    const code = `INC-${Date.now()
      .toString()
      .slice(-8)}`;


    const r = await query(
      `
        INSERT INTO incidents (
          incident_code,
          title,
          zone_name,
          location,
          severity,
          risk_score,
          flood_probability,
          source_summary,
          recommended_actions,
          assigned_team,
          sla_minutes
        )

        VALUES (
          $1,
          $2,
          $3,

          CASE
            WHEN $4::double precision IS NULL
              OR $5::double precision IS NULL
            THEN NULL

            ELSE ST_SetSRID(
              ST_MakePoint(
                $4::double precision,
                $5::double precision
              ),
              4326
            )::geography
          END,

          $6,
          $7,
          $8,
          $9::jsonb,
          $10::jsonb,
          $11,
          $12
        )

        RETURNING *
      `,
      [
        code,
        title,
        zoneName ?? null,

        longitude === undefined ||
        longitude === null ||
        longitude === ''
          ? null
          : Number(longitude),

        latitude === undefined ||
        latitude === null ||
        latitude === ''
          ? null
          : Number(latitude),

        severity,
        Number(riskScore) || 0,

        floodProbability === null ||
        floodProbability === undefined
          ? null
          : Number(floodProbability),

        JSON.stringify(sourceSummary || {}),
        JSON.stringify(recommendedActions || []),

        assignedTeam ?? null,
        Number(slaMinutes) || 60,
      ],
    );


    const incident = r.rows[0];


    /*
     * Record creation in the incident audit trail.
     */
    await query(
      `
        INSERT INTO incident_actions (
          incident_id,
          action_type,
          note,
          actor_id
        )
        VALUES (
          $1,
          $2,
          $3,
          $4
        )
      `,
      [
        incident.id,
        'INCIDENT_CREATED',
        'Incident created',
        req.user?.id || null,
      ],
    );


    const io = req.app.get('io');

    if (io) {
      io.emit(
        'incidentCreated',
        incident,
      );
    }


    return res
      .status(201)
      .json(incident);
  } catch (e) {
    next(e);
  }
}


/* =========================================================
   UPDATE INCIDENT
   ========================================================= */

export async function updateIncident(req, res, next) {
  try {
    const id = Number(req.params.id);

    const {
      status,
      assignedTeam,
      note,
      actionType = 'STATUS_UPDATE',
    } = req.body || {};


    if (!Number.isFinite(id)) {
      return res.status(400).json({
        message: 'Invalid incident id',
      });
    }


    if (!status) {
      return res.status(400).json({
        message: 'status is required',
      });
    }


    if (!allowedStatus.includes(status)) {
      return res.status(400).json({
        message: 'Invalid status',
      });
    }


    const r = await query(
      `
        UPDATE incidents

        SET
          status = $1,

          assigned_team = COALESCE(
            $2,
            assigned_team
          ),

          acknowledged_at =
            CASE
              WHEN $1 IN (
                'ACKNOWLEDGED',
                'DISPATCHED',
                'CONTAINED',
                'RESOLVED',
                'CLOSED'
              )
              AND acknowledged_at IS NULL

              THEN NOW()

              ELSE acknowledged_at
            END,

          resolved_at =
            CASE
              WHEN $1 IN (
                'RESOLVED',
                'CLOSED'
              )

              THEN COALESCE(
                resolved_at,
                NOW()
              )

              ELSE resolved_at
            END,

          updated_at = NOW()

        WHERE id = $3

        RETURNING *
      `,
      [
        status,
        assignedTeam ?? null,
        id,
      ],
    );


    if (!r.rowCount) {
      return res.status(404).json({
        message: 'Incident not found',
      });
    }


    /*
     * Every lifecycle transition becomes an
     * immutable incident action.
     */
    await query(
      `
        INSERT INTO incident_actions (
          incident_id,
          action_type,
          note,
          actor_id
        )

        VALUES (
          $1,
          $2,
          $3,
          $4
        )
      `,
      [
        id,
        actionType,
        note || `Status changed to ${status}`,
        req.user?.id || null,
      ],
    );


    const incident = r.rows[0];

    const io = req.app.get('io');

    if (io) {
      io.emit(
        'incidentUpdated',
        incident,
      );
    }


    return res.json(incident);
  } catch (e) {
    next(e);
  }
}


/* =========================================================
   CREATE INCIDENT ACTION
   ========================================================= */

export async function createIncidentAction(req, res, next) {
  try {
    const id = Number(req.params.id);

    const {
      actionType,
      note,
    } = req.body || {};


    if (!Number.isFinite(id)) {
      return res.status(400).json({
        message: 'Invalid incident id',
      });
    }


    if (!actionType) {
      return res.status(400).json({
        message: 'actionType is required',
      });
    }


    /*
     * Make sure the incident exists before
     * adding an action.
     */
    const incidentCheck = await query(
      `
        SELECT id
        FROM incidents
        WHERE id = $1
      `,
      [id],
    );


    if (!incidentCheck.rowCount) {
      return res.status(404).json({
        message: 'Incident not found',
      });
    }


    const r = await query(
      `
        INSERT INTO incident_actions (
          incident_id,
          action_type,
          note,
          actor_id
        )

        VALUES (
          $1,
          $2,
          $3,
          $4
        )

        RETURNING *
      `,
      [
        id,
        actionType,
        note ?? null,
        req.user?.id || null,
      ],
    );


    const action = r.rows[0];

    const io = req.app.get('io');

    if (io) {
      io.emit(
        'incidentActionCreated',
        action,
      );
    }


    return res
      .status(201)
      .json(action);
  } catch (e) {
    next(e);
  }
}


/* =========================================================
   GET SINGLE INCIDENT + TIMELINE
   ========================================================= */

export async function getIncident(req, res, next) {
  try {
    const id = Number(req.params.id);


    if (!Number.isFinite(id)) {
      return res.status(400).json({
        message: 'Invalid incident id',
      });
    }


    const { rows } = await query(
      `
        SELECT
          id,
          incident_code,
          title,
          zone_name,
          severity,
          status,
          risk_score,
          flood_probability,
          source_summary,
          recommended_actions,
          assigned_team,
          sla_minutes,
          acknowledged_at,
          resolved_at,
          created_at,
          updated_at,

          CASE
            WHEN location IS NULL THEN NULL
            ELSE ST_Y(location::geometry)
          END AS latitude,

          CASE
            WHEN location IS NULL THEN NULL
            ELSE ST_X(location::geometry)
          END AS longitude

        FROM incidents

        WHERE id = $1
      `,
      [id],
    );


    if (!rows.length) {
      return res.status(404).json({
        message: 'Incident not found',
      });
    }


    const actions = await query(
      `
        SELECT
          ia.id,
          ia.incident_id,
          ia.action_type,
          ia.note,
          ia.created_at,
          u.name AS actor_name

        FROM incident_actions ia

        LEFT JOIN users u
          ON u.id = ia.actor_id

        WHERE ia.incident_id = $1

        ORDER BY ia.created_at ASC
      `,
      [id],
    );


    return res.json({
      ...rows[0],
      timeline: actions.rows,
    });
  } catch (e) {
    next(e);
  }
}