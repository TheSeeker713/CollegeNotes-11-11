export type MicPermissionState = 'unknown' | 'granted' | 'denied' | 'revoked' | 'missing_device';
export type MicCaptureState = 'idle' | 'requesting' | 'capturing' | 'stopped';

export type MicDevice = { id: string; label: string };

export type MicControllerDeps = {
  queryPermission: () => Promise<MicPermissionState>;
  requestPermission: () => Promise<MicPermissionState>;
  listDevices: () => Promise<MicDevice[]>;
  startCapture: () => Promise<void>;
  stopCapture: () => Promise<void>;
};

/** Explicit start/stop mic state machine. Mockable for CI; never loops permission prompts. */
export class MicController {
  permission: MicPermissionState = 'unknown';
  capture: MicCaptureState = 'idle';
  private promptCount = 0;
  private capturing = false;
  constructor(private readonly deps: MicControllerDeps) {}

  promptsIssued(): number { return this.promptCount; }
  isCapturing(): boolean { return this.capturing; }

  async refreshPermission(): Promise<MicPermissionState> {
    this.permission = await this.deps.queryPermission();
    return this.permission;
  }

  async start(): Promise<{ permission: MicPermissionState; capture: MicCaptureState }> {
    if (this.capturing) return { permission: this.permission, capture: this.capture };
    this.capture = 'requesting';
    const devices = await this.deps.listDevices();
    if (!devices.length) {
      this.permission = 'missing_device';
      this.capture = 'idle';
      return { permission: this.permission, capture: this.capture };
    }
    let permission = await this.deps.queryPermission();
    if (permission === 'unknown') {
      this.promptCount += 1;
      permission = await this.deps.requestPermission();
    } else if (permission === 'denied' || permission === 'revoked') {
      // Do not re-prompt in a loop; surface the stored denial once per start attempt.
      this.permission = permission;
      this.capture = 'idle';
      return { permission: this.permission, capture: this.capture };
    }
    this.permission = permission;
    if (permission !== 'granted') {
      this.capture = 'idle';
      return { permission: this.permission, capture: this.capture };
    }
    await this.deps.startCapture();
    this.capturing = true;
    this.capture = 'capturing';
    return { permission: this.permission, capture: this.capture };
  }

  async stop(): Promise<{ permission: MicPermissionState; capture: MicCaptureState }> {
    if (this.capturing) await this.deps.stopCapture();
    this.capturing = false;
    this.capture = 'stopped';
    return { permission: this.permission, capture: this.capture };
  }

  async revoke(): Promise<MicPermissionState> {
    if (this.capturing) await this.stop();
    this.permission = 'revoked';
    return this.permission;
  }
}

export function createMockMicDeps(initial: MicPermissionState = 'unknown', devices: MicDevice[] = [{ id: 'mic-1', label: 'Synthetic Mic' }]): MicControllerDeps & { captureStarted: number; captureStopped: number; setPermission: (p: MicPermissionState) => void; setDevices: (d: MicDevice[]) => void } {
  let permission = initial;
  let deviceList = devices;
  const counters = { captureStarted: 0, captureStopped: 0 };
  return {
    get captureStarted() { return counters.captureStarted; },
    get captureStopped() { return counters.captureStopped; },
    setPermission: (p) => { permission = p; },
    setDevices: (d) => { deviceList = d; },
    queryPermission: async () => permission,
    requestPermission: async () => {
      if (permission === 'unknown') permission = 'granted';
      return permission;
    },
    listDevices: async () => deviceList,
    startCapture: async () => { counters.captureStarted += 1; },
    stopCapture: async () => { counters.captureStopped += 1; }
  };
}
