# Model sources and reproduction

Verify exports: `tools/export/.venv/Scripts/python.exe tools/export/parity.py`.
ONNX weights remain local and gitignored. Publish the `.onnx` files plus this document and `licenses/` to the release; replace literal `OWNER` in registry URLs before shipping.

| Export | Upstream repository commit | Pretrained checkpoint |
|---|---|---|
| unisal.onnx / unisal_video.onnx | [rdroste/unisal](https://github.com/rdroste/unisal/tree/7f8ca1a7ecb3dbc1bf7fca837cb6186a85ac27d9) | `training_runs/pretrained_unisal/weights_best.pth`, included in repository; strict CPU load |
| transalnet.onnx | [LJOVO/TranSalNet](https://github.com/LJOVO/TranSalNet/tree/a2aba83e3b8f54c47b712511bf4f515f236326ed) | [TranSalNet_Dense.pth](https://drive.google.com/file/d/1JVTYq5UE6Q0OHoOVoXWF5WW5w42jlM1T/view), SALICON; strict CPU load |
| sum.onnx | [Arhosseini77/SUM](https://github.com/Arhosseini77/SUM/tree/03b6eb88f35a71e9106e895014bdd8ff526d947e) | [sum_model.pth](https://drive.google.com/file/d/14ma_hLe8DrVNuHCSKoOz41Q-rB1Hbg6A/view), strict CPU load; encoder depths `[2,2,27,2]`, decoder `[2,2,2,1]` |

UNISAL uses SALICON adaptation for images and DHF1K adaptation for video. Outputs are log probabilities, represented as `output: "logit"` in the SPEC schema. Video input `frame` is `[1,3,224,384]`; hidden input/output is `[1,256,7,12]`. Reset hidden state to zero at each new sequence.

TranSalNet reproduces upstream `testing.ipynb`: BGR, divide by 255, no ImageNet normalization, resize to fit 384 x 288, centered uint8 padding value **1**, not 0. Output is sigmoid saliency; resize to cover original image, center crop, normalize to sum 1. Float outputs remain float; the upstream notebook's 8-bit PNG conversion is omitted from numeric parity.

SUM takes RGB ImageNet-normalized 256 x 256 images plus a float32 one-hot `condition` input `[1,4]`: 0=SALICON mouse, 1=natural eye tracking, 2=e-commerce, 3=UI. The model does not classify the image type. Scripted grouped recurrence implements the real-valued branch of [Mamba selective_scan_ref](https://github.com/state-spaces/mamba/blob/main/mamba_ssm/ops/selective_scan_interface.py); synthetic comparison checks equivalence before export. Full-image parity uses the unmodified upstream reference function. Attempt details: `tools/export/SUM_STATUS.md`.

Licenses: UNISAL Apache-2.0, TranSalNet MIT, SUM MIT, Mamba Apache-2.0; copies retained in `licenses/`. Checkpoints are the author-provided files linked by each licensed repository; no separate checkpoint terms were found there. Conversion changes format, freezes input shapes and selects inference domains; it does not train or quantize weights. Keep these attribution/change notices and licenses with redistributed exports.

Setup from repository root (PowerShell; venv must contain CPU torch, torchvision, onnx, onnxruntime, onnxscript, timm, einops, gdown, scipy, Pillow, huggingface_hub, opencv-python-headless):

```powershell
git clone https://github.com/rdroste/unisal tools/export/src/unisal
git -C tools/export/src/unisal checkout 7f8ca1a7ecb3dbc1bf7fca837cb6186a85ac27d9
git clone https://github.com/LJOVO/TranSalNet tools/export/src/transalnet
git -C tools/export/src/transalnet checkout a2aba83e3b8f54c47b712511bf4f515f236326ed
git clone https://github.com/Arhosseini77/SUM tools/export/src/sum
git -C tools/export/src/sum checkout 03b6eb88f35a71e9106e895014bdd8ff526d947e
tools/export/.venv/Scripts/python.exe -m gdown 1JVTYq5UE6Q0OHoOVoXWF5WW5w42jlM1T -O tools/export/src/transalnet/pretrained_models/TranSalNet_Dense.pth
tools/export/.venv/Scripts/python.exe -m gdown 14ma_hLe8DrVNuHCSKoOz41Q-rB1Hbg6A -O tools/export/src/sum/net/pre_trained_weights/sum_model.pth
```

Save Mamba's reference file under `tools/export/src/mamba/selective_scan_interface.py` (revision and SHA256 below). Then run `export_unisal.py`, `export_transalnet.py`, `export_sum.py` with the venv Python in that order. Recompute registry SHA256/size fields if any export bytes change; parity deliberately rejects stale metadata. This workspace has no `.git` directory, so Git index exclusion could not be tested; `.gitignore` supplies the requested rules.

Published benchmark references: [MIT/Tuebingen MIT300 leaderboard](https://saliency.tuebingen.ai/results.html), [UNISAL paper](https://jianbojiao.com/pdfs/ECCV_unisal.pdf), [TranSalNet paper](https://orca.cardiff.ac.uk/id/eprint/149390/9/1-s2.0-S0925231222004714-main.pdf), [SUM paper](https://openaccess.thecvf.com/content/WACV2025/papers/Hosseini_SUM_Saliency_Unification_through_Mamba_for_Visual_Attention_Modeling_WACV_2025_paper.pdf). Published research scores are not measurements of these ONNX files. Unknown scores remain null.


Mamba reference pinned to [e9594ce1c732d97440f0332fdc43170a2294dbfa](https://github.com/state-spaces/mamba/blob/e9594ce1c732d97440f0332fdc43170a2294dbfa/mamba_ssm/ops/selective_scan_interface.py). Download this exact raw file for reproduction.

| Artifact | SHA256 |
|---|---|
| UNISAL weights_best.pth | `4a9157411f1741d588b15670d15295e998805648b8b6348599fe447298338481` |
| TranSalNet_Dense.pth | `6e06313ecd67ebccfbc4e4bb31493b66ed919f0e552b3f12bad0928c2e8e33f8` |
| SUM sum_model.pth | `0dfa2b6b64f6b7e46657431005d22175770005bc217b89939c8f7247b82a70be` |
| Mamba selective_scan_interface.py | `a570f4f15a2eebabf62024a9ffb0d1dde04280300405e1632f43809f448bfb1a` |
