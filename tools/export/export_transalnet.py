"""Export the SALICON-trained TranSalNet Dense checkpoint on CPU."""

from pathlib import Path
import sys
from types import ModuleType

import torch

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "tools/export/src/transalnet"
INPUT_SIZE = (288, 384)


def load_model() -> torch.nn.Module:
    sys.path.insert(0, str(SOURCE))
    path = SOURCE / "TranSalNet_Dense.py"
    code = path.read_text()
    # Omit unused dataset imports and redundant ImageNet initialization; load all checkpoint tensors strictly below.
    code = code.replace("import pandas as pd", "").replace("from skimage import io, transform", "")
    assert code.count("densenet.densenet161(pretrained=True)") == 1
    code = code.replace("densenet.densenet161(pretrained=True)", "densenet.densenet161(pretrained=False)")
    module = ModuleType("TranSalNet_Dense")
    module.__file__ = str(path)
    exec(compile(code, str(path), "exec"), module.__dict__)
    model = module.TranSalNet()
    model.load_state_dict(torch.load(
        SOURCE / "pretrained_models/TranSalNet_Dense.pth", map_location="cpu", weights_only=True,
    ))
    return model.eval()


def main() -> None:
    torch.set_num_threads(4)
    (ROOT / "models").mkdir(exist_ok=True)
    with torch.inference_mode():
        torch.onnx.export(
            load_model(), (torch.zeros(1, 3, *INPUT_SIZE),),
            ROOT / "models/transalnet.onnx", opset_version=17,
            input_names=["image"], output_names=["heatmap"], dynamo=False,
        )
    print("Exported transalnet (Dense)")


if __name__ == "__main__":
    main()
