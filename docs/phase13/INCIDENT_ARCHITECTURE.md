# Incident Intelligence Architecture

```text
Sensors + Weather + Reports + AI + GIS + Maintenance
                    |
                    v
             Signal Fusion Layer
                    |
                    v
             Incident Prioritizer
                    |
        +-----------+-----------+
        |                       |
        v                       v
 Priority Queue          Recommended Actions
        |                       |
        +-----------+-----------+
                    v
             Incident Command
                    |
        +-----------+-----------+
        |           |           |
        v           v           v
     Crew        Alerts      Safe Route
   Dispatch     Citizens     Recompute
```

The incident service is deliberately separated from individual sensor, AI and routing services so each subsystem can evolve independently.
