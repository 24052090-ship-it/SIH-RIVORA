import app from './app.js';
import {env} from './config/env.js';
import {pool} from './db/pool.js';
import {startWeatherSync} from './services/weatherSyncService.js';
import { createRealtimeGateway } from './realtime/gateway.js';

const server=app.listen(env.port,()=>console.log(`AquaGuard API listening on http://localhost:${env.port}`));
const io = createRealtimeGateway(server);
app.set('io', io);
const weatherTimer=startWeatherSync();
function shutdown(){if(weatherTimer)clearInterval(weatherTimer);server.close(async()=>{await pool.end();process.exit(0)})}
process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
