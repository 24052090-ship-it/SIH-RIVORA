"""A lightweight Phase 28 HTTP integration smoke test.

Requires a running AquaGuard API. It intentionally avoids claiming load-test results.
"""
import argparse, json, urllib.request

def get(base, path):
    req=urllib.request.Request(base.rstrip("/") + path)
    with urllib.request.urlopen(req, timeout=10) as r:
        return r.status, r.read().decode()

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--base",default="http://localhost:5000")
    args=p.parse_args()
    endpoints=["/api/health","/api/system/deep"]
    results=[]
    for ep in endpoints:
        try:
            status, body=get(args.base,ep)
            results.append({"endpoint":ep,"status":status,"pass":200<=status<300})
        except Exception as exc:
            results.append({"endpoint":ep,"pass":False,"error":str(exc)})
    print(json.dumps({"results":results},indent=2))
    if not all(x["pass"] for x in results): raise SystemExit(1)

if __name__=="__main__": main()
