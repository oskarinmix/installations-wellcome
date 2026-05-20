import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { sshPool } from "./pool";
import { SshConnectionError } from "./types";

export async function runCommand(
  oltId: string,
  command: string,
  timeoutMs = 15_000,
): Promise<string> {
  const olt = await prisma.olt.findUnique({ where: { id: oltId } });
  if (!olt) throw new SshConnectionError(`olt ${oltId} not found`);
  const password = decrypt(olt.password);
  return sshPool.run(
    oltId,
    { host: olt.host, port: olt.port, username: olt.username, password },
    command,
    timeoutMs,
  );
}
