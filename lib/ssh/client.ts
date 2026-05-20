import { Client, type ClientChannel } from "ssh2";
import {
  SshAuthError, SshConnectionError, SshTimeoutError,
  type SshCredentials,
} from "./types";

const PROMPT_RE = /[#>]\s*$|[Pp]assword[:\s]*$/;
const MORE_RE = /--\s*[Mm]ore\s*--/;

export class SshClient {
  private conn: Client | null = null;
  private stream: ClientChannel | null = null;
  private alive = false;
  private buffer = "";
  private closedReject: ((e: Error) => void) | null = null;

  constructor(private creds: SshCredentials) {}

  isAlive(): boolean {
    return this.alive;
  }

  async connect(): Promise<void> {
    this.conn = new Client();
    await new Promise<void>((resolve, reject) => {
      const c = this.conn!;
      c.on("ready", () => resolve());
      c.on("error", (e) => {
        if (/authentication/i.test(e.message)) reject(new SshAuthError(e.message));
        else reject(new SshConnectionError(e.message));
      });
      c.connect({
        host: this.creds.host,
        port: this.creds.port,
        username: this.creds.username,
        password: this.creds.password,
        readyTimeout: 10_000,
      });
    });

    this.stream = await new Promise<ClientChannel>((resolve, reject) => {
      this.conn!.shell((err, s) => {
        if (err) reject(new SshConnectionError(err.message));
        else resolve(s);
      });
    });

    this.stream.on("data", (chunk: Buffer) => {
      this.buffer += chunk.toString("utf8");
    });
    this.stream.on("close", () => {
      this.alive = false;
      this.closedReject?.(new SshConnectionError("connection closed by remote"));
      this.closedReject = null;
    });

    await this.waitForPrompt(10_000);
    // Only escalate if shell opened in user mode (>); privileged mode (#) needs no enable
    if (/>\s*$/.test(this.buffer)) {
      const afterEnable = await this.sendAndWait("enable\n", 5_000).catch(() => "");
      // OLT re-prompts for password after enable
      if (/[Pp]assword[:\s]*$/.test(afterEnable)) {
        await this.sendAndWait(this.creds.password + "\n", 5_000).catch(() => {});
      }
    }
    await this.sendAndWait("conf t\n", 5_000).catch(() => {});
    await this.sendAndWait("terminal length 0\n", 5_000).catch(() => {});
    this.alive = true;
  }

  async exec(command: string, timeoutMs: number): Promise<string> {
    if (!this.alive || !this.stream) throw new SshConnectionError("not connected");
    const raw = await this.sendAndWait(command + "\n", timeoutMs);
    return this.stripEchoAndPrompt(raw, command);
  }

  disconnect(): void {
    this.alive = false;
    try { this.stream?.end(); } catch {}
    try { this.conn?.end(); } catch {}
    this.conn = null;
    this.stream = null;
  }

  private async sendAndWait(data: string, timeoutMs: number): Promise<string> {
    const before = this.buffer.length;
    this.stream!.write(data);
    return this.waitForPrompt(timeoutMs, before);
  }

  private waitForPrompt(timeoutMs: number, sliceFrom = 0): Promise<string> {
    return new Promise((resolve, reject) => {
      this.closedReject = reject;
      const start = Date.now();
      let lastMoreAt = -1;
      const check = () => {
        const slice = this.buffer.slice(sliceFrom);
        const clean = slice.replace(/\x1b\[[0-9;]*[A-Za-z]/g, "").replace(/\r/g, "");
        const moreMatch = MORE_RE.exec(clean);
        if (moreMatch && sliceFrom + moreMatch.index > lastMoreAt) {
          lastMoreAt = sliceFrom + moreMatch.index;
          this.stream!.write(" ");
        }
        if (PROMPT_RE.test(clean)) {
          this.closedReject = null;
          return resolve(slice);
        }
        if (Date.now() - start > timeoutMs) {
          this.closedReject = null;
          return reject(new SshTimeoutError(`prompt timeout after ${timeoutMs}ms`));
        }
        setTimeout(check, 50);
      };
      check();
    });
  }

  private stripEchoAndPrompt(raw: string, command: string): string {
    let out = raw.replace(/\x1b\[[0-9;]*[A-Za-z]/g, "").replace(/\r/g, "");
    const idx = out.indexOf(command);
    if (idx >= 0) out = out.slice(idx + command.length);
    out = out.replace(/--\s*[Mm]ore\s*--/g, "");
    out = out.replace(/[^\n]*[#>]\s*$/, "");
    return out.trim();
  }
}
