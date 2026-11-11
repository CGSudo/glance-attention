import { Transport } from './transport';
import { HttpTransport } from './http';
import { MockTransport } from './mock';
import { TauriTransport } from './tauri';

export * from './types';
export * from './transport';
export { HttpTransport } from './http';
export { MockTransport } from './mock';
export { TauriTransport } from './tauri';

export const isTauri = '__TAURI_INTERNALS__' in window;
const isMockEnv = import.meta.env.VITE_GLANCE_MOCK === '1' || import.meta.env.VITE_GLANCE_MOCK === 'true';

let activeTransport: Transport = isTauri ? new TauriTransport() : isMockEnv ? new MockTransport() : new HttpTransport();

export function getTransport(): Transport {
  return activeTransport;
}

export function setTransport(transport: Transport): void {
  activeTransport = transport;
}

export function isMockMode(): boolean {
  return activeTransport instanceof MockTransport;
}
