import api from './api';

export async function geocodeAddress(q,lat=null,lng=null){
  const params={q};
  if(Number.isFinite(Number(lat))&&Number.isFinite(Number(lng))){
    params.lat=Number(lat);
    params.lng=Number(lng);
  }
  const {data}=await api.get('/providers/geocode',{params});
  return data;
}

export async function reverseGeocodeLocation(lat,lng){
  const {data}=await api.get('/providers/reverse-geocode',{params:{lat,lng}});
  return data;
}

export default {geocodeAddress,reverseGeocodeLocation};
