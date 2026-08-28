import { Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing/Landing';
import Login from './pages/Login/Login';
import Signup from './pages/Signup/Signup';
import CitizenLayout from './components/layout/CitizenLayout';
import AuthorityLayout from './components/layout/AuthorityLayout';
import Dashboard from './pages/citizen/Dashboard/Dashboard';
import CitizenMap from './pages/citizen/Map/Map';
import Report from './pages/citizen/Report/Report';
import Reports from './pages/citizen/Reports/Reports';
import SafeRoute from './pages/citizen/SafeRoute/SafeRoute';
import CitizenAlerts from './pages/citizen/Alerts/Alerts';
import Profile from './pages/citizen/Profile/Profile';
import AuthorityDashboard from './pages/authority/Dashboard/Dashboard';
import LiveMonitoring from './pages/authority/LiveMonitoring/LiveMonitoring';
import FloodRisk from './pages/authority/FloodRisk/FloodRisk';
import AuthorityReports from './pages/authority/Reports/Reports';
import Maintenance from './pages/authority/Maintenance/Maintenance';
import Sensors from './pages/authority/Sensors/Sensors';
import Analytics from './pages/authority/Analytics/Analytics';
import AuthorityAlerts from './pages/authority/Alerts/Alerts';
import Settings from './pages/authority/Settings/Settings';
import Simulation from './pages/authority/Simulation/Simulation';
import Technology from './pages/Technology/Technology';
import PredictiveMaintenance from './pages/authority/PredictiveMaintenance/PredictiveMaintenance';
import Satellite from './pages/authority/Satellite/Satellite';
import SystemReadiness from './pages/authority/SystemReadiness/SystemReadiness';
import HydroIntelligence from './pages/authority/HydroIntelligence/HydroIntelligence';
import IntegrationHub from './pages/authority/IntegrationHub/IntegrationHub';
import ValidationCenter from './pages/authority/ValidationCenter/ValidationCenter';
import MLOpsCenter from './pages/authority/MLOpsCenter/MLOpsCenter';import IncidentCommand from './pages/authority/IncidentCommand/IncidentCommand';
import EmergencyCenter from './pages/authority/EmergencyCenter/EmergencyCenter';import DigitalTwin from './pages/authority/DigitalTwin/DigitalTwin';
import OperationsCenter from './pages/authority/OperationsCenter/OperationsCenter';import FieldOperations from './pages/authority/FieldOperations/FieldOperations';import FieldMobile from './pages/authority/FieldMobile/FieldMobile';import DataIntegration from './pages/authority/DataIntegration/DataIntegration';
import ProtectedRoute from './routes/ProtectedRoute';
import RealtimeToast from './components/common/RealtimeToast/RealtimeToast';



export default function App(){return <><RealtimeToast/><Routes>
<Route path="/" element={<Landing/>}/><Route path="/technology" element={<Technology/>}/><Route path="/login" element={<Login/>}/><Route path="/signup" element={<Signup/>}/>
<Route path="/citizen" element={<ProtectedRoute role="citizen"><CitizenLayout/></ProtectedRoute>}><Route index element={<Navigate to="dashboard" replace/>}/><Route path="dashboard" element={<Dashboard/>}/><Route path="map" element={<CitizenMap/>}/><Route path="report" element={<Report/>}/><Route path="reports" element={<Reports/>}/><Route path="safe-route" element={<SafeRoute/>}/><Route path="alerts" element={<CitizenAlerts/>}/><Route path="profile" element={<Profile/>}/></Route>
<Route path="/authority" element={<ProtectedRoute role="authority"><AuthorityLayout/></ProtectedRoute>}><Route index element={<Navigate to="dashboard" replace/>}/><Route path="dashboard" element={<AuthorityDashboard/>}/><Route path="live-monitoring" element={<LiveMonitoring/>}/><Route path="hydro-intelligence" element={<HydroIntelligence/>}/><Route path="integration-hub" element={<IntegrationHub/>}/><Route path="flood-risk" element={<FloodRisk/>}/><Route path="reports" element={<AuthorityReports/>}/><Route path="maintenance" element={<Maintenance/>}/><Route path="sensors" element={<Sensors/>}/><Route path="analytics" element={<Analytics/>}/><Route path="alerts" element={<AuthorityAlerts/>}/><Route path="settings" element={<Settings/>}/><Route path="simulation" element={<Simulation/>}/><Route path="predictive-maintenance" element={<PredictiveMaintenance/>}/><Route path="satellite" element={<Satellite/>}/><Route path="readiness" element={<SystemReadiness/>}/><Route path="validation" element={<ValidationCenter/>}/><Route path="mlops" element={<MLOpsCenter/>}/><Route path="incident-command" element={<IncidentCommand/>}/><Route path="emergency-center" element={<EmergencyCenter/>}/><Route path="digital-twin" element={<DigitalTwin/>}/><Route path="operations" element={<OperationsCenter/>}/><Route path="field-operations" element={<FieldOperations/>}/><Route path="field-mobile" element={<FieldMobile/>}/><Route path="data-integration" element={<DataIntegration/>}/></Route>
<Route path="*" element={<Navigate to="/" replace/>}/></Routes></>}
