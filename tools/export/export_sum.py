"""Attempt SUM CPU export using Mamba's reference recurrence, at most twice."""

import ast
import importlib
from pathlib import Path
import sys
import traceback
from types import ModuleType

from einops import rearrange, repeat
import torch
import torch.nn.functional as F

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "tools/export/src/sum"
INPUT_SIZE = (256, 256)


def reference_scan():
    path = ROOT / "tools/export/src/mamba/selective_scan_interface.py"
    tree = ast.parse(path.read_text())
    function = next(n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == "selective_scan_ref")
    module = ModuleType("mamba_reference")
    module.__file__ = str(path)
    module.__dict__.update(torch=torch, F=F, rearrange=rearrange, repeat=repeat)
    sys.modules[module.__name__] = module
    exec(compile(ast.Module(body=[function], type_ignores=[]), str(path), "exec"), module.__dict__)
    return module.selective_scan_ref


@torch.jit.script
def grouped_scan(u: torch.Tensor, delta: torch.Tensor, A: torch.Tensor,
                 B: torch.Tensor, C: torch.Tensor, D: torch.Tensor,
                 bias: torch.Tensor) -> torch.Tensor:
    # SUM uses real grouped B/C, softplus delta, no z, and no last-state output.
    delta = F.softplus(delta.float() + bias[None, :, None])
    batch, channels, length = u.shape
    groups, state_size = B.shape[1], A.shape[1]
    width = channels // groups
    # shortcut: fixed CPU float32 SUM scan; extend for other Mamba variants before reuse.
    chunk = 32
    padding = (chunk - length % chunk) % chunk
    chunks = (length + padding) // chunk
    dt = F.pad(delta, (0, padding)).reshape(batch, groups, width, chunks, chunk).permute(4, 0, 1, 3, 2).contiguous()
    x = F.pad(u, (0, padding)).reshape(batch, groups, width, chunks, chunk).permute(4, 0, 1, 3, 2).contiguous()
    B = F.pad(B, (0, padding)).reshape(batch, groups, state_size, chunks, chunk).permute(4, 0, 1, 3, 2).contiguous()
    C = F.pad(C, (0, padding)).reshape(batch, groups, state_size, chunks, chunk).permute(4, 0, 1, 3, 2).contiguous()
    a = A.reshape(1, groups, 1, width, state_size)
    state = torch.zeros_like(dt[0].unsqueeze(-1) * a)
    values = torch.jit.annotate(list[torch.Tensor], [])
    # Independent chunks share this short recurrence; MatMul avoids a full state-sized projection temporary.
    for i in range(chunk):
        step = dt[i].unsqueeze(-1)
        state = torch.exp(step * a) * state + (step * x[i].unsqueeze(-1)) * B[i].unsqueeze(3)
        values.append(torch.matmul(state, C[i].unsqueeze(-1)).squeeze(-1))
    cumulative = torch.clamp(dt.cumsum(0).unsqueeze(-1) * a.unsqueeze(0), max=0.)
    decay = torch.exp(cumulative[-1])
    end = state
    state = torch.zeros_like(end[:, :, 0])
    starts = torch.jit.annotate(list[torch.Tensor], [])
    for i in range(chunks):
        starts.append(state)
        state = decay[:, :, i] * state + end[:, :, i]
    start = torch.stack(starts, dim=2)
    correction = torch.matmul(torch.exp(cumulative) * start.unsqueeze(0), C.unsqueeze(-1)).squeeze(-1)
    y = (torch.stack(values, dim=0) + correction).permute(1, 2, 4, 3, 0).reshape(batch, channels, -1)
    return y[:, :, :length] + u * D[None, :, None]


def fixed_scan(u, delta, A, B, C, D, z=None, delta_bias=None,
               delta_softplus=False, return_last_state=False):
    assert z is None and delta_softplus and not return_last_state
    return grouped_scan(u, delta, A, B, C, D, delta_bias)


def load_model(scan=None) -> torch.nn.Module:
    if "net" not in sys.modules:
        package = ModuleType("net")
        package.__path__ = [str(SOURCE / "net")]
        sys.modules["net"] = package
    vmamba = importlib.import_module("net.models.vmamba")
    vmamba.selective_scan_fn = scan or reference_scan()
    from net.models.SUM import SUM

    model = SUM(depths=[2, 2, 27, 2], depths_decoder=[2, 2, 2, 1], drop_path_rate=0.3)
    model.load_state_dict(torch.load(
        SOURCE / "net/pre_trained_weights/sum_model.pth", map_location="cpu", weights_only=True,
    ))
    return model.eval()


def main() -> None:
    torch.set_num_threads(4)
    errors = []
    for approach in ("scripted upstream selective_scan_ref", "scripted grouped reference recurrence"):
        try:
            if not errors:
                scan = torch.jit.script(reference_scan())
            else:
                torch.manual_seed(0)
                u, dt = torch.randn(1, 8, 9), torch.randn(1, 8, 9)
                A = -torch.rand(8, 3)
                B, C = torch.randn(1, 4, 3, 9), torch.randn(1, 4, 3, 9)
                D, bias = torch.randn(8), torch.randn(8)
                expected = reference_scan()(u, dt, A, B, C, D, delta_bias=bias, delta_softplus=True)
                torch.testing.assert_close(grouped_scan(u, dt, A, B, C, D, bias), expected, rtol=1e-5, atol=1e-6)
                scan = fixed_scan
            with torch.inference_mode():
                torch.onnx.export(
                    load_model(scan), (torch.zeros(1, 3, *INPUT_SIZE), torch.tensor([[0., 1., 0., 0.]])),
                    ROOT / "models/sum.onnx", opset_version=17, dynamo=False,
                    input_names=["image", "condition"], output_names=["heatmap"],
                )
            (ROOT / "tools/export/SUM_STATUS.md").write_text(
                f"SUM exported: {approach}.\n\n" + "\n\n".join(errors), encoding="utf-8",
            )
            print("Exported sum", flush=True)
            return
        except Exception:
            error = f"## {approach}\n```text\n{traceback.format_exc()}```"
            errors.append(error)
            print(error, flush=True)
    (ROOT / "tools/export/SUM_STATUS.md").write_text(
        "SUM skipped after two failed approaches. Input: 256x256; CPU; opset 17.\n\n" + "\n\n".join(errors),
        encoding="utf-8",
    )
    raise SystemExit(1)


if __name__ == "__main__":
    main()
