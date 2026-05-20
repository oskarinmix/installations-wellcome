import { SshClient } from "./client";
import type { SshCredentials } from "./types";

interface PoolEntry {
  client: SshClient;
  chain: Promise<unknown>;
}

export class SshPool {
  private entries = new Map<string, PoolEntry>();
  private connecting = new Map<string, Promise<void>>();

  async run(
    oltId: string,
    creds: SshCredentials,
    command: string,
    timeoutMs: number,
  ): Promise<string> {
    let entry = this.entries.get(oltId);
    if (!entry || !entry.client.isAlive()) {
      // Serialize connection attempts: if one is in progress, wait for it.
      let connPromise = this.connecting.get(oltId);
      if (!connPromise) {
        const client = new SshClient(creds);
        connPromise = client.connect().then(() => {
          this.entries.set(oltId, { client, chain: Promise.resolve() });
        }).finally(() => {
          this.connecting.delete(oltId);
        });
        this.connecting.set(oltId, connPromise);
      }
      await connPromise;
      entry = this.entries.get(oltId)!;
    }
    const next = entry.chain.then(() => entry!.client.exec(command, timeoutMs));
    entry.chain = next.catch(() => {});
    return next as Promise<string>;
  }

  disconnect(oltId: string) {
    const e = this.entries.get(oltId);
    if (e) {
      e.client.disconnect();
      this.entries.delete(oltId);
    }
  }

  disconnectAll() {
    for (const id of this.entries.keys()) this.disconnect(id);
  }
}

declare global {
  var sshPool: SshPool | undefined;
}

export const sshPool = globalThis.sshPool ?? new SshPool();
if (process.env.NODE_ENV !== "production") globalThis.sshPool = sshPool;

if (typeof process !== "undefined") {
  const shutdown = () => sshPool.disconnectAll();
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}
