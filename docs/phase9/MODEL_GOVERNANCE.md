# AI Model Governance

For every released model record:
- model version
- dataset version
- collection period
- geographic coverage
- train/validation/test split method
- metrics: precision, recall, F1, ROC-AUC for flood classification
- vision metrics: mAP, precision, recall, IoU
- known failure cases
- approval date and owner

For rainfall/flood time series, prefer event- or time-based splits rather than random row splits to reduce leakage.
