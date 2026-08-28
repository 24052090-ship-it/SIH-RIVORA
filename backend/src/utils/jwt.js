import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
export const signUser=(user)=>jwt.sign({id:user.id,name:user.name,email:user.email,role:user.role},env.jwtSecret,{expiresIn:'7d'});
