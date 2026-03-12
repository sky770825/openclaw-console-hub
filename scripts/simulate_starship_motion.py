import json
import math
import os

def generate_motion_json(duration_sec=2.0, fps=30):
    """
    Simulates the 'Busy Starship' motion parameters over time.
    Calculates sine-wave based breathing and high-frequency hand movement.
    """
    total_frames = int(duration_sec * fps)
    motion_data = {
        "Version": 3,
        "Meta": {
            "Duration": duration_sec,
            "Fps": fps,
            "Loop": True,
            "CurveCount": 3,
            "TotalSegmentCount": 3 * total_frames
        },
        "Curves": [
            {
                "Target": "Parameter",
                "Id": "ParamBreath",
                "Segments": [0, 0]
            },
            {
                "Target": "Parameter",
                "Id": "ParamHandBusy",
                "Segments": [0, 0]
            },
            {
                "Target": "Parameter",
                "Id": "ParamConsoleGlow",
                "Segments": [0, 0]
            }
        ]
    }

    for i in range(1, total_frames):
        t = i / fps
        # Breathing (Slow sine)
        breath = (math.sin(t * 2 * math.pi / 2.0) + 1) / 2
        # Hand Busy (Fast erratic sine)
        hand = (math.sin(t * 2 * math.pi * 5.0) + 1) / 2
        # Glow (Flickering)
        glow = 0.7 + 0.3 * math.sin(t * 2 * math.pi * 10.0)

        motion_data["Curves"][0]["Segments"].extend([t, breath])
        motion_data["Curves"][1]["Segments"].extend([t, hand])
        motion_data["Curves"][2]["Segments"].extend([t, glow])

    output_path = "/Users/caijunchang/.openclaw/workspace/sandbox/output/starship_busy.motion3.json"
    with open(output_path, "w") as f:
        json.dump(motion_data, f, indent=2)
    
    print(f"Successfully generated prototype motion file: {output_path}")

if __name__ == "__main__":
    generate_motion_json()
