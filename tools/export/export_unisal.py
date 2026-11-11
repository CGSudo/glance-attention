"""Export pretrained UNISAL image and recurrent single-frame models on CPU."""

import json
from pathlib import Path
import sys
from types import ModuleType

import torch

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "tools/export/src/unisal"
IMAGE_SIZE = (288, 384)
VIDEO_SIZE = (224, 384)
STATE_SHAPE = (1, 256, 7, 12)


def load_model(video: bool = False) -> torch.nn.Module:
    # Import inference modules without the upstream training-only dependencies.
    if "unisal" not in sys.modules:
        package = ModuleType("unisal")
        package.__path__ = [str(SOURCE / "unisal")]
        sys.modules["unisal"] = package
    from unisal.model import UNISAL

    run = SOURCE / "training_runs/pretrained_unisal"
    config = json.loads((run / "UNISAL.json").read_text())
    config["cnn_cfg"]["pretrained"] = False
    model = UNISAL(**config)
    model.load_state_dict(torch.load(run / "weights_best.pth", map_location="cpu", weights_only=True))
    return VideoModel(model).eval() if video else ImageModel(model).eval()


class ImageModel(torch.nn.Module):
    def __init__(self, model: torch.nn.Module):
        super().__init__()
        self.model = model

    def forward(self, frame):
        return self.model(frame.unsqueeze(1), source="SALICON", static=True)[:, 0]


class VideoModel(ImageModel):
    def forward(self, frame, hidden):
        heatmap, state = self.model(
            frame.unsqueeze(1), source="DHF1K", static=False,
            h0=[hidden], return_hidden=True,
        )
        return heatmap[:, 0], state[0]


def main() -> None:
    torch.set_num_threads(4)
    (ROOT / "models").mkdir(exist_ok=True)
    for video, size in ((False, IMAGE_SIZE), (True, VIDEO_SIZE)):
        model = load_model(video)
        frame = torch.zeros(1, 3, *size)
        args = (frame, torch.zeros(STATE_SHAPE)) if video else (frame,)
        name = "unisal_video" if video else "unisal"
        with torch.inference_mode():
            torch.onnx.export(
                model, args, ROOT / f"models/{name}.onnx", opset_version=17,
                input_names=["frame", "hidden"] if video else ["image"],
                output_names=["heatmap", "new_hidden"] if video else ["heatmap"],
                dynamo=False,
            )
        print(f"Exported {name}", flush=True)


if __name__ == "__main__":
    main()
