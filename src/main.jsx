import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import './styles/global.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { RealtimeProvider } from './context/RealtimeContext';

createRoot(document.getElementById('root')).render(<React.StrictMode><BrowserRouter><AuthProvider><RealtimeProvider><App/></RealtimeProvider></AuthProvider></BrowserRouter></React.StrictMode>);
