import { query } from '../db/pool.js';

export async function overview(req,res,next){
  try{
    const [crews,tasks]=await Promise.all([
      query(`SELECT id,crew_code,name,specialty,status,members,contact,updated_at,ST_Y(location::geometry) latitude,ST_X(location::geometry) longitude FROM response_crews ORDER BY CASE status WHEN 'EN_ROUTE' THEN 1 WHEN 'ON_SITE' THEN 2 WHEN 'ASSIGNED' THEN 3 WHEN 'AVAILABLE' THEN 4 ELSE 5 END,name`),
      query(`SELECT dt.id,dt.task_code,dt.priority,dt.task_type,dt.description,dt.status,dt.due_at,dt.started_at,dt.completed_at,dt.created_at,rc.crew_code,rc.name crew_name,ST_Y(dt.location::geometry) latitude,ST_X(dt.location::geometry) longitude FROM dispatch_tasks dt LEFT JOIN response_crews rc ON rc.id=dt.crew_id WHERE dt.status NOT IN ('COMPLETED','CANCELLED') ORDER BY CASE dt.priority WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'MEDIUM' THEN 3 ELSE 4 END,dt.created_at DESC`)
    ]);
    res.json({generatedAt:new Date().toISOString(),crews:crews.rows,tasks:tasks.rows,summary:{available:crews.rows.filter(x=>x.status==='AVAILABLE').length,active:crews.rows.filter(x=>['ASSIGNED','EN_ROUTE','ON_SITE'].includes(x.status)).length,queued:tasks.rows.filter(x=>x.status==='QUEUED').length,critical:tasks.rows.filter(x=>x.priority==='CRITICAL').length}});
  }catch(e){next(e)}
}

export async function createTask(req,res,next){
  try{
    const {priority='HIGH',taskType='INSPECTION',description,crewId=null,lat=null,lng=null,dueAt=null,incidentId=null}=req.body||{};
    if(!description)return res.status(400).json({message:'description is required'});
    if(!['LOW','MEDIUM','HIGH','CRITICAL'].includes(priority))return res.status(400).json({message:'Invalid priority'});
    const code=`DT-${Date.now().toString().slice(-8)}`;
    const r=await query(`INSERT INTO dispatch_tasks(task_code,incident_id,crew_id,priority,task_type,description,status,location,due_at,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,CASE WHEN $8::numeric IS NULL OR $9::numeric IS NULL THEN NULL ELSE ST_SetSRID(ST_MakePoint($9,$8),4326)::geography END,$10,$11) RETURNING id,task_code,priority,task_type,description,status,due_at`,[code,incidentId||null,crewId||null,priority,taskType,description,crewId?'ASSIGNED':'QUEUED',lat,lng,dueAt||null,req.user?.id||null]);
    if(crewId) await query(`UPDATE response_crews SET status='ASSIGNED',updated_at=NOW() WHERE id=$1`,[crewId]);
    const io=req.app.get('io'); if(io) io.emit('dispatchTaskCreated',r.rows[0]);
    res.status(201).json(r.rows[0]);
  }catch(e){next(e)}
}

export async function updateTask(req,res,next){
  try{
    const id=Number(req.params.id); const {status,crewId}=req.body||{};
    const allowed=['QUEUED','ASSIGNED','EN_ROUTE','ON_SITE','COMPLETED','CANCELLED'];
    if(!allowed.includes(status))return res.status(400).json({message:'Invalid status'});
    const r=await query(`UPDATE dispatch_tasks SET status=$1,crew_id=COALESCE($2,crew_id),started_at=CASE WHEN $1 IN ('EN_ROUTE','ON_SITE') AND started_at IS NULL THEN NOW() ELSE started_at END,completed_at=CASE WHEN $1='COMPLETED' THEN NOW() ELSE completed_at END,updated_at=NOW() WHERE id=$3 RETURNING *`,[status,crewId||null,id]);
    if(!r.rowCount)return res.status(404).json({message:'Task not found'});
    if(crewId) await query(`UPDATE response_crews SET status=CASE WHEN $1 IN ('COMPLETED','CANCELLED') THEN 'AVAILABLE' ELSE CASE WHEN $1='EN_ROUTE' THEN 'EN_ROUTE' WHEN $1='ON_SITE' THEN 'ON_SITE' ELSE 'ASSIGNED' END END,updated_at=NOW() WHERE id=$2`,[status,crewId]);
    const io=req.app.get('io'); if(io) io.emit('dispatchTaskUpdated',r.rows[0]);
    res.json(r.rows[0]);
  }catch(e){next(e)}
}

export async function fieldUpdate(req,res,next){
  try{
    const id=Number(req.params.id); const {status,lat=null,lng=null,accuracy=null}=req.body||{};
    const allowed=['EN_ROUTE','ON_SITE','COMPLETED'];
    if(!allowed.includes(status)) return res.status(400).json({message:'Invalid field status'});
    const task=await query(`UPDATE dispatch_tasks SET status=$1,started_at=CASE WHEN $1 IN ('EN_ROUTE','ON_SITE') AND started_at IS NULL THEN NOW() ELSE started_at END,completed_at=CASE WHEN $1='COMPLETED' THEN NOW() ELSE completed_at END,updated_at=NOW() WHERE id=$2 RETURNING *`,[status,id]);
    if(!task.rowCount)return res.status(404).json({message:'Task not found'});
    const crew=await query(`SELECT crew_id FROM dispatch_tasks WHERE id=$1`,[id]);
    if(crew.rows[0]?.crew_id){
      await query(`UPDATE response_crews SET status=CASE WHEN $1='COMPLETED' THEN 'AVAILABLE' WHEN $1='EN_ROUTE' THEN 'EN_ROUTE' ELSE 'ON_SITE' END,updated_at=NOW() WHERE id=$2`,[status,crew.rows[0].crew_id]);
      if(lat!==null&&lng!==null) await query(`INSERT INTO crew_checkins(crew_id,task_id,location,accuracy_m) VALUES($1,$2,ST_SetSRID(ST_MakePoint($4,$3),4326)::geography,$5)`,[crew.rows[0].crew_id,id,lat,lng,accuracy]);
    }
    await query(`INSERT INTO task_status_updates(task_id,status,latitude,longitude,created_by) VALUES($1,$2,$3,$4,$5)`,[id,status,lat,lng,req.user?.id||null]);
    const io=req.app.get('io'); if(io) io.emit('fieldTaskUpdated',{taskId:id,status,lat,lng});
    res.json({task:task.rows[0],offlineCapable:true});
  }catch(e){next(e)}
}
