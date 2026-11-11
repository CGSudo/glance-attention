/// <reference types="@figma/plugin-typings/plugin-api" />
declare const figma: PluginAPI;
declare const __html__: string;
figma.showUI(__html__, { width: 400, height: 620 });
let analyzedFrame: FrameNode | null = null;
let busy = false;

figma.ui.onmessage = async (message) => {
  if (busy) return;
  busy = true;
  try {
    if (message.type === "analyze") {
      analyzedFrame = null;
      const selection = figma.currentPage.selection;
      if (selection.length !== 1 || selection[0].type !== "FRAME") {
        throw new Error("Select one frame, then click Analyze selected frame.");
      }
      const frame = selection[0];
      const bytes = await frame.exportAsync({ format: "PNG", constraint: { type: "SCALE", value: 2 } });
      analyzedFrame = frame;
      figma.ui.postMessage({ type: "image", bytes });
    } else if (message.type === "place") {
      if (!analyzedFrame || analyzedFrame.removed || !analyzedFrame.parent) {
        throw new Error("Frame unavailable. Select a frame and analyze again.");
      }
      if (!Array.isArray(message.bytes) || !message.bytes.length ||
          !message.bytes.every((byte: number) => Number.isInteger(byte) && byte >= 0 && byte <= 255)) {
        throw new Error("Heatmap unavailable. Analyze the frame again.");
      }
      const image = figma.createImage(new Uint8Array(message.bytes));
      const transform = analyzedFrame.relativeTransform;
      const layer = figma.createRectangle();
      layer.name = "Glance heatmap";
      analyzedFrame.parent.insertChild(analyzedFrame.parent.children.indexOf(analyzedFrame) + 1, layer);
      if ("layoutMode" in analyzedFrame.parent && analyzedFrame.parent.layoutMode !== "NONE") {
        layer.layoutPositioning = "ABSOLUTE";
      }
      layer.resize(analyzedFrame.width, analyzedFrame.height);
      layer.relativeTransform = transform;
      layer.fills = [{ type: "IMAGE", imageHash: image.hash, scaleMode: "FILL" }];
      layer.opacity = 0.55;
      figma.ui.postMessage({ type: "placed" });
    }
  } catch (error) {
    figma.ui.postMessage({ type: "error", message: error instanceof Error ? error.message : String(error) });
  } finally {
    busy = false;
  }
};
