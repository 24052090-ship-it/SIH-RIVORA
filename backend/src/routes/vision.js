import { Router } from 'express';
import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';
import { requireAuth } from '../middleware/auth.js';
import { env } from '../config/env.js';
import { query } from '../db/pool.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.visionMaxBytes },
  fileFilter: (req, file, cb) => cb(null, ['image/jpeg','image/png','image/webp'].includes(file.mimetype))
});

async function resolveVisionRegistryModel(modelVersion) {
  const [runtimeResult, productionResult] = await Promise.all([
    query(
      `SELECT id, model_name, version, task, status, dataset_version,
              artifact_uri, promoted_at
       FROM ai_model_registry
       WHERE model_name = 'vision-yolo'
         AND version = $1
       LIMIT 1`,
      [modelVersion]
    ),
    query(
      `SELECT id, model_name, version, task, status, dataset_version,
              artifact_uri, promoted_at
       FROM ai_model_registry
       WHERE model_name = 'vision-yolo'
         AND status = 'production'
       ORDER BY promoted_at DESC NULLS LAST, id DESC
       LIMIT 1`
    )
  ]);

  return {
    runtimeModel: runtimeResult.rows[0] ?? null,
    productionModel: productionResult.rows[0] ?? null
  };
}


function visionGovernanceMetadata(runtimeModel, productionModel, modelVersion) {
  const runtimeIsProduction = runtimeModel?.status === 'production';
  const productionMismatch = Boolean(
    productionModel &&
    (!runtimeModel || runtimeModel.id !== productionModel.id)
  );

  return {
    model_name: runtimeModel?.model_name ?? 'vision-yolo',
    model_version: modelVersion ?? null,
    model_status: runtimeModel?.status ?? 'unregistered-development',
    dataset_version: runtimeModel?.dataset_version ?? null,
    registry_model_id: runtimeModel?.id ?? null,
    mode: runtimeIsProduction ? 'production' : 'development-fallback',
    production_model: runtimeIsProduction,
    production_mismatch: productionMismatch,
    warning: productionMismatch
      ? (
          'A production vision model is registered, but the AI runtime is ' +
          'serving a different model version.'
        )
      : (
          runtimeIsProduction
            ? null
            : (
                'No matching production vision model is active. ' +
                'Vision inference remains explicitly development-only.'
              )
        )
  };
}

router.post('/analyze-image', requireAuth, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'An image file is required.' });
    const form = new FormData();
    form.append('file', req.file.buffer, { filename: req.file.originalname, contentType: req.file.mimetype });
    const { data } = await axios.post(`${env.aiServiceUrl}/vision/analyze`, form, {
      headers: form.getHeaders(),
      maxBodyLength: env.visionMaxBytes,
      timeout: 60000
    });

    const {
      runtimeModel,
      productionModel
    } = await resolveVisionRegistryModel(data?.model_version);

    const governance = visionGovernanceMetadata(
      runtimeModel,
      productionModel,
      data?.model_version
    );

    if (governance.production_mismatch) {
      return res.status(503).json({
        error: (
          'Production vision model/runtime mismatch. ' +
          'Refusing silent development fallback.'
        ),
        inference: governance
      });
    }

    const prediction = await query(
      `INSERT INTO ai_predictions
        (model_id, prediction_type, input_features, output, confidence, source)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, created_at`,
      [
        runtimeModel?.id ?? null,
        'vision-detection',
        {
          filename: req.file.originalname,
          mime_type: req.file.mimetype,
          size_bytes: req.file.size,
          zone: req.body?.zone ?? null
        },
        data,
        data?.confidence ?? null,
        'fastapi-yolo'
      ]
    );

    res.json({
      ...data,
      inference: {
        ...governance,
        prediction_id: prediction.rows[0].id,
        prediction_timestamp: prediction.rows[0].created_at,
        confidence: data?.confidence ?? null,
        source: 'fastapi-yolo'
      }
    });
  } catch (error) {
    if (error.response) return res.status(error.response.status).json({ error: error.response.data?.detail || 'Vision service error.' });
    if (['ECONNREFUSED','ETIMEDOUT','ECONNABORTED'].includes(error.code)) {
      return res.status(503).json({ error: 'Vision service unavailable.' });
    }
    next(error);
  }
});

router.get('/status', requireAuth, async (req, res, next) => {
  try {
    const { data } = await axios.get(`${env.aiServiceUrl}/vision/info`, { timeout: 5000 });
    const {
      runtimeModel,
      productionModel
    } = await resolveVisionRegistryModel(data?.model_version);

    res.json({
      ...data,
      inference: visionGovernanceMetadata(
        runtimeModel,
        productionModel,
        data?.model_version
      )
    });
  } catch (error) {
    if (error.response) return res.status(error.response.status).json({ error: error.response.data?.detail || 'Vision service error.' });
    if (['ECONNREFUSED','ETIMEDOUT','ECONNABORTED'].includes(error.code)) {
      return res.status(503).json({ error: 'Vision service unavailable.' });
    }
    next(error);
  }
});

export default router;
