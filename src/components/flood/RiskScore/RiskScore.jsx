import { ShieldAlert, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getCurrentFloodPrediction } from '../../../services/aiService';
import './RiskScore.css';

export default function RiskScore({ compact=false }){
  const [risk,setRisk]=useState(null);
  useEffect(()=>{let alive=true;getCurrentFloodPrediction().then(data=>{if(alive)setRisk(data.result)}).catch(()=>{});return()=>{alive=false}},[]);
  const score=Math.round((risk?.probability ?? .48)*100);
  const level=risk?.risk_level ?? 'MEDIUM';
  return <div className={`risk-score-card ${compact?'compact':''}`}>
    <div className="risk-score-icon"><ShieldAlert size={18}/></div>
    <div className="risk-score-main">
      <div className="eyebrow">AI FLOOD PREDICTION</div>
      <div className="risk-score-value"><strong>{score}%</strong><span className={`badge badge-${level.toLowerCase()}`}>{level}</span></div>
      <p>{risk?.model_version||'Loading model'} · probability of significant waterlogging</p>
    </div>
    <TrendingUp className="risk-trend" size={18}/>
  </div>;
}
