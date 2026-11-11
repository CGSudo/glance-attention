SUM exported: chunk-parallel float32 scan, C=32. CPU median: 2973.8 ms (previous report: 52482.9 ms).

Parity: all 4 registry models PASS; SUM raw max 7.45e-7, sum-normalized max 2.18e-11; peak-normalized max 7.75e-7 across 3 samples. Scan boundary/decay regression: 16 cases PASS.

Conditions 0/1/2/3: distinct outputs; each raw/sum/peak diff < 1e-3 against original PyTorch on product.png (raw max 7.75e-7).

Implementation: parallel independent chunks, 32-step batched local recurrence, short L/32 boundary Loop, CumSum/Exp carry correction, MatMul projection. Exponent arguments remain nonpositive; no inverse exponentials or float64 required.

Attempts (isolated scan input [1,1536,1024], 4 CPU threads):
- Dense SSD-style state-specific matrices: C=32 took 6219.7 ms; C=64 took 14118.5 ms; C=128 exhausted memory (1610612736-byte allocation). Rejected.
- Parallel segment tree: 438.4 ms ORT. Rejected for latency.
- Factored CumSum: float32 overflowed on real SUM inputs; float64 restored parity, 271.0 ms ORT. Rejected for latency.
- Batched local recurrence + log-prefix carry correction: 84.7 ms ORT; full final model meets target.

Verify: `tools/export/.venv/Scripts/python.exe tools/export/test_sum_scan.py`; `tools/export/.venv/Scripts/python.exe tools/export/parity.py`; `Get-FileHash models/sum.onnx -Algorithm SHA256`.

Scope: only scan replacement changed in export_sum.py; its status label and parity.py's generated SUM prose still describe the previous export. Re-running those generators overwrites these descriptions. Model/registry checks remain current.

Previous exporter fallback diagnostic:

## scripted upstream selective_scan_ref
```text
Traceback (most recent call last):
  File "<repo>\tools\export\export_sum.py", line 98, in main
    scan = torch.jit.script(reference_scan())
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "<repo>\tools\export\.venv\Lib\site-packages\torch\jit\_script.py", line 1501, in script
    ret = _script_impl(
          ^^^^^^^^^^^^^
  File "<repo>\tools\export\.venv\Lib\site-packages\torch\jit\_script.py", line 1261, in _script_impl
    fn = torch._C._jit_script_compile(
         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "<repo>\tools\export\.venv\Lib\site-packages\torch\jit\_recursive.py", line 991, in try_compile_fn
    return torch.jit.script(fn, _rcb=rcb)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "<repo>\tools\export\.venv\Lib\site-packages\torch\jit\_script.py", line 1501, in script
    ret = _script_impl(
          ^^^^^^^^^^^^^
  File "<repo>\tools\export\.venv\Lib\site-packages\torch\jit\_script.py", line 1258, in _script_impl
    ast = get_jit_def(obj, obj.__name__)
          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "<repo>\tools\export\.venv\Lib\site-packages\torch\jit\frontend.py", line 380, in get_jit_def
    return build_def(
           ^^^^^^^^^^
  File "<repo>\tools\export\.venv\Lib\site-packages\torch\jit\frontend.py", line 430, in build_def
    param_list = build_param_list(ctx, py_def.args, self_name, pdt_arg_types)
                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "<repo>\tools\export\.venv\Lib\site-packages\torch\jit\frontend.py", line 460, in build_param_list
    raise NotSupportedError(ctx_range, _vararg_kwarg_err)
torch.jit.frontend.NotSupportedError: Compiled functions can't take variable number of arguments or use keyword-only arguments with defaults:
  File "<repo>\tools\export\.venv\Lib\site-packages\einops\einops.py", line 561
def rearrange(tensor: Union[Tensor, List[Tensor]], pattern: str, **axes_lengths: Size) -> Tensor:
                                                                  ~~~~~~~~~~~~~ <--- HERE
    """
    einops.rearrange is a reader-friendly smart element reordering for multidimensional tensors.

```
