import onnxruntime as ort
import os

model_path = r"E:\antigravityProj\duribility\src-tauri\assets\svm_model.onnx"

if not os.path.exists(model_path):
    print(f"Model not found at {model_path}")
    exit(1)

session = ort.InferenceSession(model_path)

print("--- ONNX MODEL FULL AUDIT ---")
for i, input in enumerate(session.get_inputs()):
    print(f"Node #{i}: Name='{input.name}', Shape={input.shape}, Type={input.type}")
print("-----------------------------")
