"""Transparent AquaGuard multimodal risk-fusion baseline.

This is a development decision-support score, not a calibrated probability.
"""
import argparse, json

def clamp(x): return max(0.0, min(100.0, float(x)))

def level(score):
    if score >= 75: return "CRITICAL"
    if score >= 50: return "HIGH"
    if score >= 25: return "MEDIUM"
    return "LOW"

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--flood-probability", type=float, required=True)
    p.add_argument("--vision-severity", type=float, default=0)
    p.add_argument("--rainfall", type=float, default=0)
    p.add_argument("--water-level", type=float, default=0)
    p.add_argument("--blockage", type=float, default=0)
    args = p.parse_args()

    rainfall_norm = clamp(args.rainfall / 100 * 100)
    score = (
        0.35 * clamp(args.flood_probability) +
        0.20 * clamp(args.vision_severity) +
        0.20 * rainfall_norm +
        0.15 * clamp(args.water_level) +
        0.10 * clamp(args.blockage)
    )
    result = {
        "score": round(score, 2),
        "level": level(score),
        "interpretation": "DEVELOPMENT DECISION-SUPPORT SCORE",
        "factors": {
            "flood_probability": args.flood_probability,
            "vision_severity": args.vision_severity,
            "rainfall": args.rainfall,
            "water_level": args.water_level,
            "blockage": args.blockage
        }
    }
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()
