import { useState } from 'react';
import { UploadCloud, MapPin, ClipboardList, Send, CheckCircle2, ScanSearch, AlertTriangle } from 'lucide-react';
import PageHeader from '../../../components/layout/PageHeader';
import Button from '../../../components/common/Button/Button';
import { analyzeImage } from '../../../services/visionService';
import { createReport } from '../../../services/reportService';
import './Report.css';

const steps = [['Upload Photo', UploadCloud], ['Select Location', MapPin], ['Problem Details', ClipboardList], ['Submit', Send]];

export default function Report() {
  const [step, setStep] = useState(0), [file, setFile] = useState(null), [analysis, setAnalysis] = useState(null), [loading, setLoading] = useState(false), [error, setError] = useState(''), [submitted, setSubmitted] = useState(null);
  const [category, setCategory] = useState('Blocked Drain');
  const [description, setDescription] = useState('');
  const [location] = useState({ label: 'Koramangala 4th Block', latitude: 12.9358, longitude: 77.6245 });

  const next = async () => {
    setError('');
    if (step === 0 && !file) return setError('Please select a photo first.');
    if (step === 0 && file && !analysis) {
      try { setLoading(true); setAnalysis(await analyzeImage(file)); } catch (e) { setError(e.response?.data?.error || e.message || 'AI image analysis failed.'); } finally { setLoading(false); }
      return;
    }
    if (step < 3) return setStep(step + 1);
    try {
      setLoading(true);
      const result = await createReport({ category, description, latitude: location.latitude, longitude: location.longitude, zone: 'Zone 4', imageUrl: file?.name || null, aiLabel: analysis?.label, aiConfidence: analysis?.confidence, aiSeverity: analysis?.severity });
      setSubmitted(result);
    } catch (e) { setError(e.response?.data?.error || e.message || 'Could not submit report.'); } finally { setLoading(false); }
  };

  if (submitted) return <div className="animate-in"><PageHeader eyebrow="Citizen reporting" title="Report submitted" copy="Your report has been sent to the RIVORA authority workflow."/><section className="report-card glass"><CheckCircle2 size={42}/><h3>{submitted.id || 'Report received'}</h3><p>Status: {submitted.status || 'Submitted'}</p><Button onClick={() => window.location.reload()}>Create another report</Button></section></div>;

  return <div className="animate-in"><PageHeader eyebrow="Citizen reporting" title="Report a Drainage Problem" copy="Upload a field image for RIVORA computer-vision analysis. Phase 5 uses a custom YOLO service when trained weights are installed."/><div className="steps">{steps.map(([x,I],i)=><div className={i<=step?'step active':'step'} key={x}><span>{i+1}</span><I size={15}/><b>{x}</b></div>)}</div><div className="report-layout"><section className="report-card glass">
    {step===0&&<><h3>Upload a photo</h3><p>Use a clear image of a drain, flooded road, waterlogging or blockage.</p><label className="upload-box">{file?<><CheckCircle2 size={28}/><strong>{file.name}</strong><small>Ready for AI analysis</small></>:<><UploadCloud size={32}/><strong>Drag & drop an image</strong><small>JPEG, PNG or WebP · up to 10 MB</small></>}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{setFile(e.target.files?.[0]||null);setAnalysis(null)}}/></label>{analysis&&<div className="vision-result"><div className="eyebrow"><ScanSearch size={14}/> AI VISION RESULT</div><h4>{analysis.label.replaceAll('_',' ').toUpperCase()}</h4><div className="ai-stat"><span>Severity</span><b className={analysis.severity==='CRITICAL'||analysis.severity==='HIGH'?'danger-text':''}>{analysis.severity}</b></div><div className="ai-stat"><span>Confidence</span><b>{Math.round(analysis.confidence*100)}%</b></div><div className="confidence"><span style={{width:`${Math.round(analysis.confidence*100)}%`}}/></div><small>{analysis.status === 'DEMO' ? 'DEMO DATA — trained model not connected.' : 'Custom RIVORA YOLO inference.'}</small></div>}</>}
    {step===1&&<><h3>Select location</h3><p>Phase 5 uses a structured location contract ready for browser geolocation and PostGIS.</p><div className="location-preview"><MapPin size={28}/><strong>{location.label}</strong><span>{location.latitude}, {location.longitude}</span></div></>}
    {step===2&&<><h3>Problem details</h3><div className="form-stack"><label>Category<select className="select" value={category} onChange={e=>setCategory(e.target.value)}><option>Blocked Drain</option><option>Water Logging</option><option>Overflowing Manhole</option><option>Flooded Road</option></select></label><label>Description<textarea className="textarea" value={description} onChange={e=>setDescription(e.target.value)} placeholder="Describe what you observed…"/></label></div></>}
    {step===3&&<><h3>Review & submit</h3><div className="review-row"><span>Location</span><b>{location.label}</b></div><div className="review-row"><span>Category</span><b>{category}</b></div><div className="review-row"><span>Photo</span><b>{file?.name||'—'}</b></div><div className="review-row"><span>AI Result</span><b>{analysis ? `${analysis.label} · ${Math.round(analysis.confidence*100)}%` : 'Not analyzed'}</b></div></>}
    {error&&<div className="form-error"><AlertTriangle size={16}/>{error}</div>}<div className="report-actions"><Button variant="ghost" onClick={()=>setStep(Math.max(0,step-1))} disabled={step===0||loading}>Back</Button><Button onClick={next} disabled={loading}>{loading?'Analyzing…':step===0&&!analysis?'Analyze Image':step===3?'Submit Report':'Continue'}</Button></div>
  </section><aside className="ai-preview glass"><div className="eyebrow">COMPUTER VISION</div><h3>YOLO Analysis</h3><p>Phase 5 adds a FastAPI image endpoint and custom RIVORA YOLO training pipeline.</p><div className="ai-stat"><span>Target classes</span><b>6</b></div><div className="ai-stat"><span>Max image</span><b>10 MB</b></div><div className="ai-stat"><span>Output</span><b>Boxes + Severity</b></div><small>Custom model weights are intentionally not bundled; train on labeled local imagery before operational use.</small></aside></div></div>
}
