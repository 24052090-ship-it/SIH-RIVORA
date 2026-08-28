import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import {env} from './config/env.js';

import auth from './routes/auth.js';
import providers from './routes/providers.js';
import dashboard from './routes/dashboard.js';
import gis from './routes/gis.js';
import telemetry from './routes/telemetry.js';
import reports from './routes/reports.js';
import alerts from './routes/alerts.js';
import maintenance from './routes/maintenance.js';
import system from './routes/system.js';
import compat from './routes/compat.js';
import ai from './routes/ai.js';
import routes from './routes/routes.js';
import vision from './routes/vision.js';
import phase8 from './routes/phase8.js';
import realtime from './routes/realtime.js';
import audit from './routes/audit.js';
import readiness from './routes/readiness.js';
import deepHealth from './routes/deepHealth.js';
import validation from './routes/validation.js';
import mlops from './routes/mlops.js';
import incidents from './routes/incidents.js';
import emergency from './routes/emergency.js';
import digitalTwin from './routes/digitalTwin.js';
import operations from './routes/operations.js';
import fieldOperations from './routes/fieldOperations.js';
import dataIntegration from './routes/dataIntegration.js';
import {notFound,errorHandler} from './middleware/error.js';
import {rateLimit} from './middleware/rateLimit.js';

const app=express();

if(env.trustProxyHops>0){
  app.set('trust proxy',env.trustProxyHops);
}

app.use(helmet());
app.use(cors({origin:env.corsOrigin}));
app.use(express.json({limit:'2mb'}));
app.use('/api',rateLimit({windowMs:60_000,max:300}));
app.use(morgan('dev'));

app.get('/api/health',(req,res)=>res.json({
  status:'ok',
  service:'aquaguard-api',
  version:'31.0.0'
}));

app.use('/api/auth',auth);
app.use('/api/providers',providers);
app.use('/api/dashboard',dashboard);
app.use('/api/gis',gis);
app.use('/api',telemetry);
app.use('/api',compat);
app.use('/api/reports',reports);
app.use('/api/alerts',alerts);
app.use('/api/maintenance',maintenance);
app.use('/api/system',system);
app.use('/api/ai',ai);
app.use('/api/vision',vision);
app.use('/api/routes',routes);
app.use('/api',phase8);
app.use('/api/realtime',realtime);
app.use('/api/audit',audit);
app.use('/api/validation',validation);
app.use('/api/mlops',mlops);
app.use('/api/incidents',incidents);
app.use('/api/emergency',emergency);
app.use('/api/digital-twin',digitalTwin);
app.use('/api/system/operations',operations);
app.use('/api/field-operations',fieldOperations);
app.use('/api/data-integration',dataIntegration);
app.use('/api/system/readiness',readiness);
app.use('/api/system',deepHealth);

app.use(notFound);
app.use(errorHandler);

export default app;
