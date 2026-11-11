"""Verify every registry ONNX against its pretrained PyTorch model on CPU."""

import hashlib
import json
from pathlib import Path
import platform
import statistics
import time

import cv2
import numpy as np
import onnx
import onnxruntime as ort
from PIL import Image
import torch
import torch.nn.functional as F

ROOT = Path(__file__).resolve().parents[2]
SAMPLES = ("portrait", "webpage", "product")
TOLERANCE = 1e-3


def preprocess(image: Image.Image, entry: dict) -> torch.Tensor:
    config = entry["input"]
    w, h = config["w"], config["h"]
    if config["resize"] == "letterbox":
        source = np.asarray(image, dtype=np.uint8)[:, :, ::-1]
        iw, ih = image.size
        if ih / h > iw / w:
            nw, nh = max(1, iw * h // ih), h
        else:
            nw, nh = w, max(1, ih * w // iw)
        pixels = np.full((h, w, 3), config["padding_value"], dtype=np.uint8)
        left, top = (w - nw) // 2, (h - nh) // 2
        pixels[top:top + nh, left:left + nw] = cv2.resize(source, (nw, nh), interpolation=cv2.INTER_LINEAR)
    else:
        interpolation = getattr(Image.Resampling, config["interpolation"].upper())
        pixels = np.asarray(image.resize((w, h), interpolation), dtype=np.uint8)
    tensor = torch.from_numpy(pixels.copy()).permute(2, 0, 1).float() / 255
    mean = torch.tensor(config["mean"])[:, None, None]
    std = torch.tensor(config["std"])[:, None, None]
    return ((tensor - mean) / std).unsqueeze(0)


def postprocess(raw: np.ndarray, entry: dict, size: tuple[int, int]) -> np.ndarray:
    w, h = size
    heatmap = raw[0, 0].astype(np.float32)
    if entry["input"]["resize"] == "letterbox":
        ph, pw = heatmap.shape
        if h / ph > w / pw:
            nw = pw * h // ph
            heatmap = cv2.resize(heatmap, (nw, h), interpolation=cv2.INTER_LINEAR)
            heatmap = heatmap[:, (nw - w) // 2:(nw - w) // 2 + w]
        else:
            nh = ph * w // pw
            heatmap = cv2.resize(heatmap, (w, nh), interpolation=cv2.INTER_LINEAR)
            heatmap = heatmap[(nh - h) // 2:(nh - h) // 2 + h, :]
    else:
        heatmap = F.interpolate(torch.from_numpy(heatmap)[None, None], size=(h, w),
                                mode="bilinear", align_corners=False)[0, 0].numpy()
    if entry["output"] == "logit":
        heatmap = np.exp(heatmap - heatmap.max())
    assert np.isfinite(heatmap).all() and heatmap.min() >= 0 and heatmap.sum() > 0
    return heatmap / heatmap.sum(dtype=np.float64)


def difference(expected: np.ndarray, actual: np.ndarray) -> float:
    assert expected.shape == actual.shape, (expected.shape, actual.shape)
    assert np.isfinite(expected).all() and np.isfinite(actual).all(), "Non-finite output"
    error = float(np.abs(expected - actual).max())
    assert error < TOLERANCE, f"max abs diff {error:.9g} >= {TOLERANCE}"
    return error


def verify(entry: dict) -> dict:
    name = entry["id"]
    path = ROOT / "models" / entry["url"].rsplit("/", 1)[1]
    with path.open("rb") as stream:
        assert hashlib.file_digest(stream, "sha256").hexdigest() == entry["sha256"], f"{name}: SHA256 mismatch"
    assert path.stat().st_size == entry["size_bytes"], f"{name}: size mismatch"
    graph = onnx.load(path)
    onnx.checker.check_model(graph)
    assert graph.opset_import[0].version == 17
    assert all(not tensor.external_data for tensor in graph.graph.initializer), "External weights must be embedded"
    del graph
    options = ort.SessionOptions()
    options.intra_op_num_threads = 4
    options.inter_op_num_threads = 1
    session = ort.InferenceSession(str(path), options, providers=["CPUExecutionProvider"])
    if name.startswith("unisal"):
        from export_unisal import load_model
        model = load_model(video=name == "unisal_video")
    elif name == "transalnet":
        from export_transalnet import load_model
        model = load_model()
    elif name == "sum":
        from export_sum import load_model
        model = load_model()
    else:
        raise ValueError(f"No PyTorch reference for {name}")
    inputs = session.get_inputs()
    assert inputs[0].shape == [1, 3, entry["input"]["h"], entry["input"]["w"]]
    assert all(value.type == "tensor(float)" for value in inputs)
    hidden_pt = torch.zeros(entry["state"]["shape"]) if name == "unisal_video" else None
    hidden_ort = hidden_pt.numpy().copy() if hidden_pt is not None else None
    result = {"id": name, "max_diff": 0., "raw_diff": 0., "state_diff": 0.}
    outdir = ROOT / f"samples/expected/{name}"
    outdir.mkdir(parents=True, exist_ok=True)
    for index, sample in enumerate(SAMPLES):
        print(f"CHECK {name}: {sample} ({index + 1}/3)", flush=True)
        with Image.open(ROOT / f"samples/{sample}.png") as opened:
            image = opened.convert("RGB")
        tensor = preprocess(image, entry)
        args = (tensor,)
        feeds = {inputs[0].name: tensor.numpy()}
        if hidden_pt is not None:
            args = (tensor, hidden_pt)
            feeds["hidden"] = hidden_ort
        if name == "sum":
            # The samples exercise natural eye tracking, UI, and e-commerce conditions.
            condition = torch.eye(4)[[1, 3, 2][index]].unsqueeze(0)
            args = (tensor, condition)
            feeds["condition"] = condition.numpy()
        with torch.inference_mode():
            predicted = model(*args)
        expected = [value.numpy() for value in predicted] if isinstance(predicted, tuple) else [predicted.numpy()]
        actual = session.run(None, feeds)
        assert len(expected) == len(actual)
        raw_error = difference(expected[0], actual[0])
        pt_map = postprocess(expected[0], entry, image.size)
        ort_map = postprocess(actual[0], entry, image.size)
        error = difference(pt_map, ort_map)
        # Sum normalization can hide shape errors in large images; also compare peak-normalized maps.
        peak_error = difference(pt_map / pt_map.max(), ort_map / ort_map.max())
        result["max_diff"] = max(result["max_diff"], error)
        result["raw_diff"] = max(result["raw_diff"], raw_error)
        if hidden_pt is not None:
            result["state_diff"] = max(result["state_diff"], difference(expected[1], actual[1]))
            hidden_pt, hidden_ort = predicted[1].clone(), actual[1]
        Image.fromarray(np.round(pt_map / pt_map.max() * 65535).astype(np.uint16)).save(outdir / f"{sample}.png")
        print(f"  diff={error:.3g}; raw={raw_error:.3g}; peak={peak_error:.3g}", flush=True)
    session.run(None, feeds)
    durations = []
    for _ in range(3):
        started = time.perf_counter()
        session.run(None, feeds)
        durations.append((time.perf_counter() - started) * 1000)
    result["cpu_ms"] = statistics.median(durations)
    print(f"PASS {name}: diff={result['max_diff']:.3g}, raw={result['raw_diff']:.3g}, "
          f"state={result['state_diff']:.3g}, CPU={result['cpu_ms']:.1f} ms", flush=True)
    return result


def main() -> None:
    torch.set_num_threads(4)
    cv2.setNumThreads(1)
    entries = json.loads((ROOT / "models/registry.json").read_text(encoding="utf-8"))
    assert entries and len({entry["id"] for entry in entries}) == len(entries)
    assert {p.name for p in (ROOT / "models").glob("*.onnx")} == {e["url"].rsplit("/", 1)[1] for e in entries}
    # A uniform density remains uniform when resized and normalized.
    uniform = postprocess(np.zeros((1, 1, 2, 2), dtype=np.float32),
                          {"input": {"resize": "stretch"}, "output": "logit"}, (4, 3))
    np.testing.assert_allclose(uniform, np.full((3, 4), 1 / 12), rtol=1e-6)
    results = [verify(entry) for entry in entries]
    lines = ["# ONNX export report", "", "PASS: all registry models; CPU only; embedded weights; opset 17.",
             "", "| Model | Status | Input W x H | Bytes | CPU ms | Max parity diff | Raw / state diff |",
             "|---|---|---|---:|---:|---:|---|"]
    for entry, result in zip(entries, results):
        lines.append(f"| {entry['id']} | PASS | {entry['input']['w']} x {entry['input']['h']} | "
                     f"{entry['size_bytes']} | {result['cpu_ms']:.1f} | {result['max_diff']:.3g} | "
                     f"{result['raw_diff']:.3g} / {result['state_diff']:.3g} |")
    lines += ["", "Verify: `tools/export/.venv/Scripts/python.exe tools/export/parity.py`.",
              "Parity: 3 CC0 samples, sum-normalized probability maps at original size; raw and peak-normalized maps also < 1e-3.",
              "Video: zero state once, then independent PyTorch/ORT state carried across 3 frames; state also < 1e-3.",
              "CPU ms: median of 3 warmed ORT runs on product.png (1024 x 683), resized to model input; excludes decode/pre/postprocess.",
              f"Host: {platform.processor()}; {platform.platform()}; ORT {ort.__version__}; 4 intra-op threads.",
              "UNISAL: training_runs/pretrained_unisal/weights_best.pth; SALICON image / DHF1K video domains.",
              "TranSalNet: Dense SALICON checkpoint; no redundant ImageNet initialization; BGR padding value 1.",
              "SUM: first approach failed (einops **kwargs unsupported by TorchScript); grouped reference recurrence exported with ONNX Loop.",
              "SUM conditions: input one-hot float32 [1,4]; 0=SALICON, 1=natural eye tracking, 2=e-commerce, 3=UI; 1/2/3 checked.",
              "Limits: fixed batch=1/shapes; SUM CPU loops are slow; no Rust integration or release upload tested.",
              "Sources, checkpoint hashes, licensing and reproduction: models/SOURCES.md; samples/SOURCES.md."]
    assert len(lines) <= 25
    (ROOT / "tools/export/REPORT.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
