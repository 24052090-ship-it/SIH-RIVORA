import { query } from '../db/pool.js';
export async function listMaintenance(req,res){const {rows}=await query(`SELECT task,asset_code drain,location_label location,priority,crew,status,TO_CHAR(created_at AT TIME ZONE 'Asia/Kolkata','DD Mon YYYY') created FROM maintenance ORDER BY created_at DESC`);res.json(rows);}
