import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { io } from 'socket.io-client';


import { useFeatureFlags } from '../hooks/useFeatureFlags';

const RealtimeContext = createContext(null);

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL
  || (import.meta.env.PROD
    ? window.location.origin
    : 'http://localhost:5000');


export function RealtimeProvider({ children }) {
  const flags = useFeatureFlags();

  const enabled = flags.realtime;

  const [status, setStatus] = useState(
    enabled ? 'connecting' : 'disabled',
  );

  const [lastEvent, setLastEvent] = useState(null);

  const [events, setEvents] = useState([]);


  useEffect(() => {
    if (!enabled) {
      setStatus('disabled');
      return undefined;
    }

    setStatus('connecting');

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });


    const push = (name) => (payload) => {
      const event = {
        name,
        payload,
        receivedAt: new Date().toISOString(),
      };

      setLastEvent(event);

      setEvents((current) =>
        [event, ...current].slice(0, 30),
      );
    };


    const onConnect = () => {
      setStatus('connected');

      socket.emit('subscribe', 'city');
      socket.emit('subscribe', 'citizen');
      socket.emit('subscribe', 'authority');
    };


    const onDisconnect = () => {
      setStatus('disconnected');
    };


    const onConnectError = () => {
      setStatus('disconnected');
    };


    socket.on('connect', onConnect);

    socket.on('disconnect', onDisconnect);

    socket.on('connect_error', onConnectError);


    const eventNames = [
      /*
       * Existing AquaGuard realtime events.
       */
      'connectionStatus',
      'sensorUpdated',
      'riskUpdated',
      'newAlert',
      'newReport',
      'maintenanceAssigned',
      'maintenanceUpdated',

      /*
       * Phase 4 operational events.
       *
       * These names match the events emitted by the
       * Express controllers.
       */
      'alertCreated',
      'incidentCreated',
      'incidentUpdated',
      'incidentActionCreated',
    ];


    const handlers = {};

    eventNames.forEach((name) => {
      handlers[name] = push(name);

      socket.on(
        name,
        handlers[name],
      );
    });


    return () => {
      socket.off('connect', onConnect);

      socket.off(
        'disconnect',
        onDisconnect,
      );

      socket.off(
        'connect_error',
        onConnectError,
      );

      eventNames.forEach((name) => {
        socket.off(
          name,
          handlers[name],
        );
      });

      socket.disconnect();
    };
  }, [enabled]);


  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);


  const value = useMemo(
    () => ({
      enabled,
      status,
      lastEvent,
      events,
      clearEvents,
    }),
    [
      enabled,
      status,
      lastEvent,
      events,
      clearEvents,
    ],
  );


  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}


export function useRealtime() {
  return useContext(RealtimeContext);
}