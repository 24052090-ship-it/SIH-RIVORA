from pathlib import Path
import json
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix
from xgboost import XGBClassifier

BASE = Path(__file__).resolve().parents[1]
DATA = BASE / 'data' / 'synthetic_flood_training.csv'
MODEL_DIR = BASE / 'models'
MODEL_DIR.mkdir(exist_ok=True)
FEATURES = ['rainfall_15m','rainfall_1h','rainfall_3h','rainfall_24h','water_level','drain_capacity','blockage','elevation','slope','historical_incidents']

def make_data(n=4000, seed=42):
    rng=np.random.default_rng(seed)
    rainfall_15m=rng.gamma(2.0,10,n).clip(0,120)
    rainfall_1h=(rainfall_15m+rng.gamma(2.0,12,n)).clip(0,180)
    rainfall_3h=(rainfall_1h+rng.gamma(2.2,18,n)).clip(0,300)
    rainfall_24h=(rainfall_3h+rng.gamma(2.5,30,n)).clip(0,500)
    water_level=rng.uniform(5,100,n)
    drain_capacity=rng.uniform(10,100,n)
    blockage=rng.binomial(1,0.22,n)
    elevation=rng.uniform(870,980,n)
    slope=rng.uniform(0.1,8,n)
    historical=rng.poisson(2.5,n).clip(0,12)
    # Development-only synthetic relationship: higher rain/water/blockage and lower elevation/capacity increase risk.
    z=(-5.0 + 0.018*rainfall_1h + 0.010*rainfall_3h + 0.006*rainfall_24h + 0.045*water_level + 0.018*(100-drain_capacity) + 1.25*blockage + 0.12*historical - 0.012*(elevation-870) - 0.06*slope)
    p=1/(1+np.exp(-z))
    y=rng.binomial(1,p)
    return pd.DataFrame({
        'rainfall_15m':rainfall_15m,'rainfall_1h':rainfall_1h,'rainfall_3h':rainfall_3h,'rainfall_24h':rainfall_24h,
        'water_level':water_level,'drain_capacity':drain_capacity,'blockage':blockage,'elevation':elevation,'slope':slope,'historical_incidents':historical,'flooded':y
    })

def main():
    if DATA.exists():
        df=pd.read_csv(DATA)
    else:
        df=make_data()
        df.to_csv(DATA,index=False)
    X=df[FEATURES]; y=df['flooded']
    Xtr,Xte,ytr,yte=train_test_split(X,y,test_size=.2,stratify=y,random_state=42)
    model=XGBClassifier(n_estimators=220,max_depth=5,learning_rate=.06,subsample=.85,colsample_bytree=.85,objective='binary:logistic',eval_metric='logloss',random_state=42,n_jobs=2)
    model.fit(Xtr,ytr)
    pred=model.predict(Xte); prob=model.predict_proba(Xte)[:,1]
    metrics={
        'dataset':'synthetic development data','samples':int(len(df)),'features':FEATURES,
        'accuracy':round(float(accuracy_score(yte,pred)),4),
        'precision':round(float(precision_score(yte,pred,zero_division=0)),4),
        'recall':round(float(recall_score(yte,pred,zero_division=0)),4),
        'f1':round(float(f1_score(yte,pred,zero_division=0)),4),
        'roc_auc':round(float(roc_auc_score(yte,prob)),4),
        'confusion_matrix':confusion_matrix(yte,pred).tolist()
    }
    model.save_model(str(MODEL_DIR/'flood_xgb.json'))
    (MODEL_DIR/'metrics.json').write_text(json.dumps(metrics,indent=2))
    importance=dict(sorted(zip(FEATURES,model.feature_importances_), key=lambda x:x[1], reverse=True))
    (MODEL_DIR/'feature_importance.json').write_text(json.dumps({k:round(float(v),6) for k,v in importance.items()},indent=2))
    print(json.dumps(metrics,indent=2))

if __name__=='__main__': main()
