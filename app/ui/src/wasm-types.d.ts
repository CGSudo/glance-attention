// Native UI builds type-check the browser boundary without generated WASM artifacts.
declare module '*wasm/glance_wasm' {
  export class Prepared {
    readonly tensor: Float32Array;
    readonly dims: Uint32Array;
    readonly width: number;
    readonly height: number;
    free(): void;
  }
  export default function init(input: { module_or_path: string }): Promise<unknown>;
  export function preprocess(bytes: Uint8Array, model: string): Prepared;
  export function finish(output: Float32Array, dims: Uint32Array, width: number, height: number, model: string, aois: string, layers?: string): string;
  export function compare(a: string, b: string): string;
}
