from pathlib import Path
import shutil

root = Path(__file__).resolve().parent
project = Path.cwd()
source = root / 'vision.py'
target = project / 'ai-service' / 'app' / 'vision.py'
if not target.exists():
    raise SystemExit(f'Target not found: {target}')
shutil.copy2(source, target)
print(r'Applied development vision fallback to ai-service\app\vision.py')
