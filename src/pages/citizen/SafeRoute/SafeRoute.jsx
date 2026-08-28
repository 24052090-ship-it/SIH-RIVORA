import { useEffect, useState } from 'react';

import {
  Navigation,
  ShieldCheck,
  TriangleAlert,
  MapPin,
  Route as RouteIcon,
  LocateFixed,
  Clock3,
  Gauge,
} from 'lucide-react';

import PageHeader from '../../../components/layout/PageHeader';
import Button from '../../../components/common/Button/Button';
import FloodMap from '../../../components/map/FloodMap';

import { findSafeRoute } from '../../../services/routeService';
import { findGlobalTrafficRoute } from '../../../services/globalRouteService';
import { geocodeAddress } from '../../../services/geoService';

import './SafeRoute.css';


const places = {
  Koramangala: {
    lat: 12.935,
    lng: 77.615,
  },

  'MG Road': {
    lat: 12.968,
    lng: 77.66,
  },

  Indiranagar: {
    lat: 12.978,
    lng: 77.64,
  },

  Whitefield: {
    lat: 12.9698,
    lng: 77.75,
  },
};


const MODES = [
  {
    id: 'FASTEST',
    title: 'Fastest',
    description: 'Minimum travel time',
  },
  {
    id: 'BALANCED',
    title: 'Balanced',
    description: 'Time + flood risk',
  },
  {
    id: 'SAFEST',
    title: 'Safest',
    description: 'Lowest exposure',
  },
];


const inLocalRIVORACoverage = ({ lat, lng }) =>
  Number(lat) >= 12.70 && Number(lat) <= 13.20
  && Number(lng) >= 77.30 && Number(lng) <= 77.90;

function formatGoogleDifference(value) {
  if (
    value === null
    || value === undefined
    || !Number.isFinite(Number(value))
  ) {
    return null;
  }

  const minutes = Number(value);

  if (minutes === 0) {
    return 'Same ETA as Google traffic benchmark';
  }

  if (minutes > 0) {
    return `${minutes} min slower than Google traffic benchmark`;
  }

  return `${Math.abs(minutes)} min faster than Google traffic benchmark`;
}


export default function SafeRoute() {
  const [originName, setOriginName] = useState('Koramangala');

  const [destinationName, setDestinationName] = useState('MG Road');

  const [origin, setOrigin] = useState(places.Koramangala);

  const [destination, setDestination] = useState(places['MG Road']);

  const [mode, setMode] = useState('SAFEST');

  const [route, setRoute] = useState(null);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState('');

  const [usingLocation, setUsingLocation] = useState(false);


  const locateMe = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not available in this browser.');
      return;
    }

    setUsingLocation(true);
    setError('');

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setOrigin({
          lat: coords.latitude,
          lng: coords.longitude,
        });

        setOriginName('Current Location'); setRoute(null);
        setUsingLocation(false);
      },

      () => {
        setError(
          'Could not access your location. Enter a starting location manually.',
        );

        setUsingLocation(false);
      },

      {
        enableHighAccuracy: true,
        timeout: 8000,
      },
    );
  };


  useEffect(() => {
    locateMe();
  }, []);

  const search = async (requestedMode = mode) => {
    setLoading(true);
    setError('');

    try {
      const typedOrigin = originName.trim();
      if (!typedOrigin || typedOrigin === 'Locating current location…' || typedOrigin === 'Enter starting location') {
        setError('Enter a starting location or use the location button.');
        return;
      }

      let resolvedOrigin = origin;
      if (!resolvedOrigin || !Number.isFinite(Number(resolvedOrigin.lat)) || !Number.isFinite(Number(resolvedOrigin.lng))) {
        const foundOrigin = await geocodeAddress(typedOrigin);
        resolvedOrigin = { lat: Number(foundOrigin.lat), lng: Number(foundOrigin.lng) };
        setOrigin(resolvedOrigin);
      }

      

      const typedDestination = destinationName.trim();
      if (!typedDestination) {
        setError('Enter a destination.');
        return;
      }

      let resolvedDestination = destination;
      if (
        !resolvedDestination
        || !Number.isFinite(Number(resolvedDestination.lat))
        || !Number.isFinite(Number(resolvedDestination.lng))
      ) {
        const foundDestination = await geocodeAddress(
          typedDestination,
          resolvedOrigin.lat,
          resolvedOrigin.lng,
        );
        resolvedDestination = {
          lat: Number(foundDestination.lat),
          lng: Number(foundDestination.lng),
        };
        setDestination(resolvedDestination);
      }

      const useLocalRiskRouter =
        inLocalRIVORACoverage(resolvedOrigin)
        && inLocalRIVORACoverage(resolvedDestination);

      const result = useLocalRiskRouter
        ? await findSafeRoute({
            originLat: resolvedOrigin.lat,
            originLng: resolvedOrigin.lng,
            destinationLat: resolvedDestination.lat,
            destinationLng: resolvedDestination.lng,
            mode: requestedMode,
          })
        : await findGlobalTrafficRoute({
            originLat: resolvedOrigin.lat,
            originLng: resolvedOrigin.lng,
            destinationLat: resolvedDestination.lat,
            destinationLng: resolvedDestination.lng,
            mode: requestedMode,
          });

      setRoute(result);
    } catch (e) {
      setError(
        e.response?.data?.error
        || e.message
        || 'Unable to calculate a safe route.',
      );
    } finally {
      setLoading(false);
    }
  };


  const changeMode = async (nextMode) => {
    setMode(nextMode);

    /*
     * If a route is already visible, changing mode immediately
     * recalculates the route.
     */
    if (route) {
      await search(nextMode);
    }
  };


  const routeLines =
    route?.routeGeometry?.coordinates?.map(
      ([lng, lat]) => [lat, lng],
    ) || [];


  const riskClass = String(
    route?.floodRisk || 'LOW',
  ).toLowerCase();


  const comparison = route?.comparison || {};

  const google = route?.googleBenchmark;
  const hasRiskData = route?.riskDataAvailable !== false;

  const googleDifference = formatGoogleDifference(
    comparison.extraMinutesVsGoogle,
  );


  return (
    <div className="animate-in">

      <PageHeader
        eyebrow="Mobility intelligence"
        title="Safe Route"
        copy="Compare travel time with current flood, drainage and road-risk exposure before choosing a route."
      />


      <div className="route-grid">

        <section className="route-panel glass">

          <div className="route-form">

            <label>
              Your Location

              <div className="route-input-wrap">
                <MapPin size={16} />

                <input
                  className="input"
                  value={originName}
                  onChange={(e) => {
                    const value = e.target.value;

                    setOriginName(value); if (places[value]) { setOrigin(places[value]); } else { setOrigin(null); } setRoute(null);
                  }}
                  placeholder="Enter starting area"
                />

                <button
                  type="button"
                  className="route-locate"
                  onClick={locateMe}
                  title="Use my location"
                >
                  <LocateFixed size={16} />
                </button>
              </div>
            </label>


            <label>
              Destination

              <div className="route-input-wrap">
                <RouteIcon size={16} />

                <input
                  className="input"
                  value={destinationName}
                  onChange={(e) => {
                    const value = e.target.value;
                    setDestinationName(value);
                    if (places[value]) setDestination(places[value]);
                    else setDestination(null);
                    setRoute(null);
                  }}
                  placeholder="Enter any destination or address"
                />
              </div>
            </label>


            <div className="route-mode-block">

              <span className="route-mode-label">
                Route preference
              </span>

              <div className="route-mode-selector">

                {MODES.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={
                      `route-mode-button ${
                        mode === option.id ? 'active' : ''
                      }`
                    }
                    onClick={() => changeMode(option.id)}
                    disabled={loading}
                  >
                    <strong>
                      {option.title}
                    </strong>

                    <span>
                      {option.description}
                    </span>
                  </button>
                ))}

              </div>

            </div>


            <Button
              onClick={() => search(mode)}
              disabled={loading || usingLocation}
            >
              <Navigation size={15} />

              {loading
                ? 'Calculating...'
                : `Find ${mode.toLowerCase()} route`}
            </Button>

          </div>


          {error && (
            <div className="route-error">
              {error}
            </div>
          )}


          <div className="route-map">
            <FloodMap currentLocation={origin}
              routeData={route}
              routeLines={
                routeLines.length
                  ? routeLines
                  : []
              }
            />
          </div>

        </section>


        <aside className="route-info glass">

          <div className="eyebrow">
            {route?.provider === 'DEMO_SIMULATION'
              ? 'Demo simulation'
              : 'Risk-aware routing'}
          </div>


          <h3>
            {route
              ? `${route.routingMode || mode} Route`
              : 'Ready to route'}
          </h3>


          {route ? (
            <>

              <div className={`route-risk ${riskClass}`}>

                <ShieldCheck size={22} />

                <div>
                  <b>
                    {route.floodRisk}
                  </b>

                  <span>
                    Flood risk · score {route.riskScore}/100
                  </span>
                </div>

              </div>


              <div className="route-stats">

                <div>
                  <b>
                    {route.distanceKm} km
                  </b>

                  <span>
                    Distance
                  </span>
                </div>


                <div>
                  <b>
                    {route.estimatedMinutes} min
                  </b>

                  <span>
                    Est. time
                  </span>
                </div>


                <div>
                  <b>
                    {route.riskySegments ?? 0}
                  </b>

                  <span>
                    Risky segments
                  </span>
                </div>


                <div>
                  <b>
                    {route.blockedDrainExposure ?? 0}
                  </b>

                  <span>
                    Blocked-drain exposure
                  </span>
                </div>

              </div>


              <div className="route-tradeoff-grid">

                <div className="route-tradeoff-card">

                  <Clock3 size={17} />

                  <div>
                    <b>
                      +{comparison.extraMinutesVsFastest ?? 0} min
                    </b>

                    <span>
                      vs fastest
                    </span>
                  </div>

                </div>


                <div className="route-tradeoff-card">

                  <Gauge size={17} />

                  <div>
                    <b>
                      {comparison.riskReductionVsFastest ?? 0} pts
                    </b>

                    <span>
                      risk reduction
                    </span>
                  </div>

                </div>

              </div>


              {route.reasoning?.length > 0 && (

                <div className="route-note route-reasoning">

                  <TriangleAlert size={15} />

                  <div>
                    <strong>
                      Why this route?
                    </strong>

                    <ul>
                      {route.reasoning.map(
                        (reason, index) => (
                          <li key={index}>
                            {reason}
                          </li>
                        ),
                      )}
                    </ul>
                  </div>

                </div>
              )}


              {route.alternatives?.length > 0 && (

                <div className="route-comparison">

                  <strong>
                    Route comparison
                  </strong>


                  <div className="route-alternative-list">

                    {route.alternatives.map(
                      (alternative) => (

                        <button
                          key={alternative.mode}
                          type="button"
                          className={
                            `route-alternative ${
                              route.routingMode === alternative.mode
                                ? 'selected'
                                : ''
                            }`
                          }
                          onClick={() =>
                            changeMode(alternative.mode)
                          }
                          disabled={loading}
                        >

                          <div>
                            <b>
                              {alternative.mode}
                            </b>

                            <span>
                              {alternative.floodRisk} risk
                            </span>
                          </div>


                          <div>
                            <b>
                              {alternative.estimatedMinutes} min
                            </b>

                            <span>
                              {alternative.distanceKm} km
                            </span>
                          </div>


                          <div>
                            <b>
                              {alternative.riskScore}/100
                            </b>

                            <span>
                              risk
                            </span>
                          </div>

                        </button>
                      ),
                    )}

                  </div>

                </div>
              )}


              {google && (

                <div className="traffic-benchmark">

                  <strong>
                    Google traffic benchmark
                  </strong>


                  <span>
                    {google.configured
                      ? (
                        google.available
                          ? 'LIVE ROUTES API'
                          : 'LIVE · NO ROUTE'
                      )
                      : 'NOT CONFIGURED'}
                  </span>


                  {google.available && google.selected ? (

                    <p>
                      Google traffic route:{' '}

                      <b>
                        {google.selected.distanceKm} km
                      </b>

                      {' · '}

                      <b>
                        {google.selected.trafficMinutes} min
                      </b>

                      {googleDifference ? (
                        <>
                          {' · '}
                          {googleDifference}
                        </>
                      ) : null}
                    </p>

                  ) : (

                    <p>
                      {google.message
                        || 'Traffic benchmark unavailable.'}
                    </p>

                  )}

                </div>
              )}


              <div className="route-segments">

                <strong>
                  Route segments
                </strong>

                {route.segments?.map(
                  (segment, index) => (

                    <div
                      key={
                        `${
                          segment.roadName
                          || segment.roadCode
                          || 'segment'
                        }-${index}`
                      }
                    >

                      <span>
                        {segment.roadName
                          || segment.roadCode
                          || 'Road segment'}
                      </span>

                      <b
                        className={
                          `risk-pill ${
                            String(
                              segment.risk || 'LOW',
                            ).toLowerCase()
                          }`
                        }
                      >
                        {segment.risk}
                      </b>

                    </div>
                  ),
                )}

              </div>

            </>
          ) : (

            <div className="route-empty">

              <Navigation size={28} />

              <p>
                Choose a location, destination and route preference.
                RIVORA will compare travel time with flood,
                road-risk and drainage exposure.
              </p>

            </div>
          )}


          {route?.provider === 'DEMO_SIMULATION' && (
            <div className="demo-label">
              DEMO / SIMULATION DATA
            </div>
          )}

        </aside>

      </div>

    </div>
  );
}