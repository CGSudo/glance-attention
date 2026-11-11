# ONNX export report

PASS: all registry models; CPU only; embedded weights; opset 17.

| Model | Status | Input W x H | Bytes | CPU ms | Max parity diff | Raw / state diff |
|---|---|---|---:|---:|---:|---|
| unisal | PASS | 384 x 288 | 12796509 | 31.0 | 5.77e-11 | 1.53e-05 / 0 |
| unisal_video | PASS | 384 x 224 | 14719661 | 25.7 | 4.63e-11 | 1.34e-05 / 3.83e-06 |
| transalnet | PASS | 384 x 288 | 307201926 | 350.4 | 1.28e-11 | 1.49e-06 / 0 |
| sum | PASS | 256 x 256 | 233113367 | 2973.8 | 2.18e-11 | 7.45e-07 / 0 |

Verify: `tools/export/.venv/Scripts/python.exe tools/export/parity.py`.
Parity: 3 CC0 samples, sum-normalized probability maps at original size; raw and peak-normalized maps also < 1e-3.
Video: zero state once, then independent PyTorch/ORT state carried across 3 frames; state also < 1e-3.
CPU ms: median of 3 warmed ORT runs on product.png (1024 x 683), resized to model input; excludes decode/pre/postprocess.
Host: Intel64 Family 6 Model 197 Stepping 2, GenuineIntel; Windows-11-10.0.26300-SP0; ORT 1.31.1; 4 intra-op threads.
UNISAL: training_runs/pretrained_unisal/weights_best.pth; SALICON image / DHF1K video domains.
TranSalNet: Dense SALICON checkpoint; no redundant ImageNet initialization; BGR padding value 1.
SUM: C=32 independent chunks; short batched recurrence and boundary Loop; float32 CumSum/Exp carry correction, MatMul projection.
SUM conditions: input one-hot float32 [1,4]; 0=SALICON, 1=natural eye tracking, 2=e-commerce, 3=UI; 1/2/3 checked across samples; all 4 separately passed raw/sum/peak parity on product.png.
Limits: fixed batch=1/shapes; SUM measured 26.2 ms below 3 s target; no Rust integration or release upload tested.
Sources, checkpoint hashes, licensing and reproduction: models/SOURCES.md; samples/SOURCES.md.
