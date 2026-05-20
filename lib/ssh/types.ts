export interface SshCredentials {
  host: string;
  port: number;
  username: string;
  password: string;
}

export class SshAuthError extends Error {
  constructor(msg: string) { super(msg); this.name = "SshAuthError"; }
}
export class SshConnectionError extends Error {
  constructor(msg: string) { super(msg); this.name = "SshConnectionError"; }
}
export class SshTimeoutError extends Error {
  constructor(msg: string) { super(msg); this.name = "SshTimeoutError"; }
}
export class SshCommandError extends Error {
  constructor(msg: string, public readonly stdout: string) {
    super(msg);
    this.name = "SshCommandError";
  }
}
