export function isFeatureCollection(value){return value?.type==='FeatureCollection' && Array.isArray(value.features)}
export function geometryCenter(feature){
  const c=feature?.geometry?.coordinates;
  if(!c) return null;
  const walk=[];
  const visit=(node)=>Array.isArray(node)&&typeof node[0]==='number'?walk.push(node):Array.isArray(node)&&node.forEach(visit);
  visit(c);
  if(!walk.length) return null;
  const lng=walk.reduce((s,p)=>s+p[0],0)/walk.length;
  const lat=walk.reduce((s,p)=>s+p[1],0)/walk.length;
  return [lat,lng];
}
