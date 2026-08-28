import { useEffect, useState } from 'react';
import { getCurrentFloodPrediction } from '../../../services/aiService';
import './RiskFactors.css';
export default function RiskFactors(){
  const [factors,setFactors]=useState([]);
  useEffect(()=>{let alive=true;getCurrentFloodPrediction().then(data=>{if(alive)setFactors(data.result?.factors||[])}).catch(()=>{});return()=>{alive=false}},[]);
  return <div className="risk-factors">{factors.map((f,i)=><div className="risk-factor" key={f.label}><div className="risk-factor-head"><span>{f.label}</span><strong>{Math.round(f.value)}%</strong></div><div className="risk-factor-track"><i className={`tone-${i%3===0?'danger':i%3===1?'warning':'info'}`} style={{width:`${Math.min(100,Math.max(0,f.value))}%`}}/></div></div>)}</div>
}
