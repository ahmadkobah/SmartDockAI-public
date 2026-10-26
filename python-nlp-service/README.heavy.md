# Heavy (training) image for python-nlp-service

Build the heavy NLP image which installs flair, allennlp, sentence-transformers and other heavy packages.

CPU-only build:

```powershell
# from repo root
docker build -f python-nlp-service/Dockerfile.heavy -t smartdockai-python-nlp:heavy .
```

Notes:
- These images are large and may take a long time to build.
- For best results, pin `torch` to a version compatible with all heavy packages and install it before other libraries.
- Consider building on a machine with more CPU/memory or using a prebuilt image with required wheels.
