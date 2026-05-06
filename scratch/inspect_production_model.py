import onnxruntime as ort
import os

# Updated path to the REAL production model
model_path = r"E:\antigravityProj\耐久性预测软件\test system\bin\x64\Release\svm_model.onnx"

if not os.path.exists(model_path):
    print(f"Model not found at {model_path}")
    exit(1)

session = ort.InferenceSession(model_path)

print("--- REAL PRODUCTION MODEL FULL AUDIT ---")
for i, input in enumerate(session.get_inputs()):
    print(f"Node #{i}: Name='{input.name}', Shape={input.shape}, Type={input.type}")
print("---------------------------------------")
