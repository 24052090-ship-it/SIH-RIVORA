import bcrypt from 'bcryptjs';
import { query } from '../db/pool.js';
import { signUser } from '../utils/jwt.js';
const publicUser=u=>({id:u.id,name:u.name,email:u.email,role:u.role});
export async function register(req,res){
  const {name,email,password,role='citizen'}=req.body;
  if(!name||!email||!password)return res.status(400).json({error:'Name, email and password are required'});
  if(!['citizen','authority'].includes(role))return res.status(400).json({error:'Invalid role'});
  const exists=await query('SELECT id FROM users WHERE email=$1',[email.toLowerCase()]);
  if(exists.rowCount)return res.status(409).json({error:'An account with this email already exists'});
  const hash=await bcrypt.hash(password,12);
  const {rows}=await query('INSERT INTO users(name,email,password_hash,role) VALUES($1,$2,$3,$4) RETURNING id,name,email,role',[name.trim(),email.toLowerCase(),hash,role]);
  const user=rows[0];res.status(201).json({user,token:signUser(user)});
}
export async function login(req,res){
  const {email,password,role}=req.body;
  if(!email||!password)return res.status(400).json({error:'Email and password are required'});
  const {rows}=await query('SELECT * FROM users WHERE email=$1',[email.toLowerCase()]);
  const user=rows[0];
  if(!user||!(await bcrypt.compare(password,user.password_hash)))return res.status(401).json({error:'Invalid email or password'});
  if(role&&user.role!==role)return res.status(403).json({error:`This account is registered as ${user.role}`});
  res.json({user:publicUser(user),token:signUser(user)});
}
export async function me(req,res){const {rows}=await query('SELECT id,name,email,role,created_at FROM users WHERE id=$1',[req.user.id]);if(!rows[0])return res.status(404).json({error:'User not found'});res.json({user:rows[0]});}
