import {useEffect,useState} from 'react';
import {ResponsiveContainer,LineChart,Line,XAxis,YAxis,Tooltip,CartesianGrid} from 'recharts';
import {rainfall as mockRainfall} from '../../data/mockRainfall';
import rainfallService from '../../services/rainfallService';
import './Charts.css';

export default function RainfallChart(){
  const [data,setData]=useState(mockRainfall);
  useEffect(()=>{let mounted=true;rainfallService.getRainfall({limit:24}).then(rows=>{if(mounted&&rows?.length)setData(rows)}).catch(()=>{});return()=>{mounted=false}},[]);
  return <ResponsiveContainer width="100%" height={230}><LineChart data={data}><CartesianGrid stroke="rgba(148,163,184,.1)" vertical={false}/><XAxis dataKey="time" tick={{fill:'#7f92a6',fontSize:9}} axisLine={false} tickLine={false}/><YAxis tick={{fill:'#7f92a6',fontSize:9}} axisLine={false} tickLine={false}/><Tooltip contentStyle={{background:'#071321',border:'1px solid rgba(148,163,184,.18)',borderRadius:8,color:'#fff'}}/><Line type="monotone" dataKey="value" stroke="#00e5ff" strokeWidth={2.5} dot={{r:2,fill:'#00e5ff'}}/></LineChart></ResponsiveContainer>;
}
