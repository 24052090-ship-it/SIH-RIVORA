import {createContext,useContext,useEffect,useMemo,useState} from 'react';
import authService from '../services/authService';
const AuthContext=createContext(null);
export function AuthProvider({children}){
  const [user,setUser]=useState(()=>{try{return JSON.parse(localStorage.getItem('aquaguard_user'))||null}catch{return null}});
  const [loading,setLoading]=useState(true);
  useEffect(()=>{const token=localStorage.getItem('aquaguard_token');if(!token){setLoading(false);return}authService.me().then(u=>setUser(u)).catch(()=>{localStorage.removeItem('aquaguard_user');localStorage.removeItem('aquaguard_token');setUser(null)}).finally(()=>setLoading(false))},[]);
  const login=async credentials=>{const result=await authService.login(credentials);localStorage.setItem('aquaguard_user',JSON.stringify(result.user));localStorage.setItem('aquaguard_token',result.token);setUser(result.user);return result.user};
  const register=async payload=>{const result=await authService.register(payload);localStorage.setItem('aquaguard_user',JSON.stringify(result.user));localStorage.setItem('aquaguard_token',result.token);setUser(result.user);return result.user};
  const logout=()=>{localStorage.removeItem('aquaguard_user');localStorage.removeItem('aquaguard_token');setUser(null)};
  const value=useMemo(()=>({user,loading,login,register,logout,isAuthenticated:!!user}),[user,loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
export const useAuth=()=>useContext(AuthContext);
