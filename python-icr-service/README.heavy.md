# Heavy (training) image for python-icr-service

This file documents how to build the heavy/training image which includes TensorFlow, PyTorch, PaddlePaddle, EasyOCR and other heavy libraries.

Build (CPU-only):

```powershell
# from repo root
docker build -f python-icr-service/Dockerfile.heavy -t smartdockai-python-icr:heavy .
```

Notes:
- These images are large and may take many minutes to build.
- For GPU acceleration, use an NVIDIA CUDA base image and install matching CUDA-enabled wheels for torch/tensorflow.
- If you encounter pip resolution issues, pin torch and tensorflow to compatible versions and install torch first with the appropriate wheel.
