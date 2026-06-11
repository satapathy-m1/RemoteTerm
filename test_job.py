import time
import random

print("Starting data pipeline...", flush=True)
time.sleep(1)

stages = ["Loading data", "Preprocessing", "Feature extraction", "Model training", "Validation", "Saving results"]

for i, stage in enumerate(stages, 1):
    print(f"[{i}/{len(stages)}] {stage}...", flush=True)
    steps = random.randint(3, 6)
    for step in range(1, steps + 1):
        time.sleep(1)
        print(f"  step {step}/{steps} complete", flush=True)
    print(f"[{i}/{len(stages)}] {stage} done.", flush=True)
    time.sleep(0.5)

print("Pipeline finished successfully.", flush=True)