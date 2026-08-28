const buckets = new Map();

export function rateLimit({
  windowMs=60_000,
  max=120,
  message='Too many requests',
  id=null
}={}) {
  const policyKey=String(id||`${windowMs}:${max}:${message}`);

  return (req,res,next)=>{
    const key=`${policyKey}:${req.ip}:${req.path}`;
    const now=Date.now();
    const current=buckets.get(key);

    if(!current||now-current.start>=windowMs){
      buckets.set(key,{start:now,count:1});
      return next();
    }

    current.count+=1;

    if(current.count>max){
      return res.status(429).json({
        error:message,
        retryAfterMs:Math.max(0,windowMs-(now-current.start))
      });
    }

    next();
  };
}
