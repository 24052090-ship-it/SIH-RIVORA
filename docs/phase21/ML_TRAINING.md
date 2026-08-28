# Phase 21 ML Training

Pipeline:

Approved datasets → feature engineering → time-aware split → XGBoost training
→ evaluation → model artifact → MLOps registry candidate.

Recommended evaluation:
- Precision
- Recall
- F1
- ROC-AUC
- PR-AUC
- calibration
- performance by geographic zone
- performance by rainfall intensity

Never use future observations to construct training features for an earlier prediction timestamp.
