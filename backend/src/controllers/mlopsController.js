import { pool, query } from '../db/pool.js';
export async function mlopsOverview(req,res,next){try{const [models,predictions,drift,ingestion]=await Promise.all([
query(`SELECT id,model_name,version,task,status,dataset_version,metrics,created_at,promoted_at FROM ai_model_registry ORDER BY created_at DESC`),
query(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE created_at >= NOW()-INTERVAL '24 hours')::int AS last24h FROM ai_predictions`),
query(`SELECT feature_name,drift_score,status,created_at FROM ai_drift_metrics ORDER BY created_at DESC LIMIT 20`),
query(`SELECT source,status,records_seen,records_inserted,records_rejected,started_at,finished_at FROM ingestion_runs ORDER BY started_at DESC LIMIT 10`)
]);res.json({generatedAt:new Date().toISOString(),models:models.rows,predictions:predictions.rows[0],drift:drift.rows,ingestion:ingestion.rows});}catch(e){next(e)}}
export async function registerPrediction(req,res,next){try{const {modelId,predictionType,inputFeatures={},output={},confidence=null,source='api'}=req.body||{};if(!predictionType)return res.status(400).json({message:'predictionType is required'});const r=await query(`INSERT INTO ai_predictions(model_id,prediction_type,input_features,output,confidence,source) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,[modelId||null,predictionType,inputFeatures,output,confidence,source]);res.status(201).json(r.rows[0]);}catch(e){next(e)}}
export async function createDriftMetric(req,res,next){try{const {featureName,referenceMean,currentMean,referenceStd,currentStd,driftScore,status,windowStart,windowEnd}=req.body||{};if(!featureName||driftScore===undefined||!status)return res.status(400).json({message:'featureName, driftScore and status are required'});const r=await query(`INSERT INTO ai_drift_metrics(feature_name,reference_mean,current_mean,reference_std,current_std,drift_score,status,window_start,window_end) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,[featureName,referenceMean??null,currentMean??null,referenceStd??null,currentStd??null,driftScore,status,windowStart??null,windowEnd??null]);res.status(201).json(r.rows[0]);}catch(e){next(e)}}


export async function registerModelCandidate(req,res,next){
  try{
    const {
      modelName,
      version,
      task='flood-risk',
      datasetVersion,
      metrics={},
      artifactUri
    }=req.body||{};

    if(!modelName||!version||!datasetVersion||!artifactUri){
      return res.status(400).json({
        message:'modelName, version, datasetVersion and artifactUri are required'
      });
    }

    if(String(datasetVersion).toLowerCase().includes('synthetic')){
      return res.status(400).json({
        message:'Synthetic-data models cannot be registered for production promotion'
      });
    }

    const r=await query(
      `INSERT INTO ai_model_registry
       (model_name,version,task,status,dataset_version,metrics,artifact_uri)
       VALUES($1,$2,$3,'candidate',$4,$5,$6)
       ON CONFLICT(model_name,version)
       DO UPDATE SET
         task=EXCLUDED.task,
         dataset_version=EXCLUDED.dataset_version,
         metrics=EXCLUDED.metrics,
         artifact_uri=EXCLUDED.artifact_uri,
         status='candidate',
         promoted_at=NULL
       WHERE ai_model_registry.status <> 'production'
       RETURNING *`,
      [modelName,version,task,datasetVersion,metrics,artifactUri]
    );

    if(!r.rows[0]){
      return res.status(409).json({
        message:'A production model cannot be overwritten as a candidate'
      });
    }

    await query(
      `INSERT INTO audit_logs
       (actor_user_id,action,entity_type,entity_id,metadata,ip_address)
       VALUES($1,'MODEL_CANDIDATE_REGISTERED','AI_MODEL',$2,$3,$4)`,
      [
        req.user?.id||null,
        String(r.rows[0].id),
        {modelName,version,datasetVersion,status:'candidate'},
        req.ip||null
      ]
    );

    res.status(201).json(r.rows[0]);
  }catch(e){next(e)}
}

export async function promoteModel(req,res,next){
  const id=Number(req.params.id);
  const {
    acceptanceApproved,
    phase11Validated,
    rollbackModelId,
    approvalReference
  }=req.body||{};

  if(!Number.isInteger(id)){
    return res.status(400).json({message:'Valid model id is required'});
  }
  if(acceptanceApproved!==true){
    return res.status(400).json({message:'Manual acceptance approval is required'});
  }
  if(phase11Validated!==true){
    return res.status(400).json({message:'Phase 11 validation must be completed before promotion'});
  }
  if(!rollbackModelId){
    return res.status(400).json({message:'A rollback model id is required before production promotion'});
  }
  if(!approvalReference){
    return res.status(400).json({message:'approvalReference is required for an auditable manual promotion'});
  }

  const client=await pool.connect();
  try{
    await client.query('BEGIN');

    const current=await client.query(
      `SELECT * FROM ai_model_registry WHERE id=$1 FOR UPDATE`,
      [id]
    );

    if(!current.rows[0]){
      await client.query('ROLLBACK');
      return res.status(404).json({message:'Model not found'});
    }

    const model=current.rows[0];

    if(String(model.status).toLowerCase()!=='candidate'){
      await client.query('ROLLBACK');
      return res.status(400).json({message:'Only candidate models can be promoted'});
    }

    if(String(model.dataset_version||'').toLowerCase().includes('synthetic')){
      await client.query('ROLLBACK');
      return res.status(400).json({message:'Synthetic-data models cannot be promoted to production'});
    }

    const rollback=await client.query(
      `SELECT id,model_name,version,status,dataset_version
       FROM ai_model_registry
       WHERE id=$1
       FOR UPDATE`,
      [rollbackModelId]
    );

    if(!rollback.rows[0]){
      await client.query('ROLLBACK');
      return res.status(400).json({message:'Rollback model was not found'});
    }

    if(Number(rollback.rows[0].id)===id){
      await client.query('ROLLBACK');
      return res.status(400).json({message:'Candidate cannot be its own rollback model'});
    }

    if(rollback.rows[0].model_name!==model.model_name){
      await client.query('ROLLBACK');
      return res.status(400).json({message:'Rollback model must belong to the same model family'});
    }

    if(String(rollback.rows[0].dataset_version||'').toLowerCase().includes('synthetic')){
      await client.query('ROLLBACK');
      return res.status(400).json({message:'Synthetic-data models cannot be used as production rollback models'});
    }

    await client.query(
      `UPDATE ai_model_registry
       SET status='rollback'
       WHERE model_name=$1 AND status='production' AND id<>$2`,
      [model.model_name,id]
    );

    await client.query(
      `UPDATE ai_model_registry SET status='rollback' WHERE id=$1`,
      [rollbackModelId]
    );

    const promoted=await client.query(
      `UPDATE ai_model_registry
       SET status='production',promoted_at=NOW()
       WHERE id=$1
       RETURNING *`,
      [id]
    );

    await client.query(
      `INSERT INTO audit_logs
       (actor_user_id,action,entity_type,entity_id,metadata,ip_address)
       VALUES($1,'MODEL_PROMOTED','AI_MODEL',$2,$3,$4)`,
      [
        req.user?.id||null,
        String(id),
        {
          modelName:model.model_name,
          version:model.version,
          datasetVersion:model.dataset_version,
          rollbackModelId:Number(rollbackModelId),
          approvalReference,
          phase11Validated:true,
          acceptanceApproved:true,
          automaticPromotion:false
        },
        req.ip||null
      ]
    );

    await client.query('COMMIT');
    return res.json({
      model:promoted.rows[0],
      rollbackModel:rollback.rows[0],
      automaticPromotion:false
    });
  }catch(e){
    try{await client.query('ROLLBACK')}catch{}
    next(e);
  }finally{
    client.release();
  }
}
