import { spawnSync } from "node:child_process";

const executable = process.platform === "win32" ? "npx.cmd" : "npx";
const attempts = 3;

for (let attempt = 1; attempt <= attempts; attempt += 1) {
  const result = spawnSync(executable, ["prisma", "migrate", "deploy"], {
    encoding: "utf8",
    env: process.env,
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) throw result.error;
  if (result.status === 0) process.exit(0);

  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  const lockTimedOut = output.includes("P1002") && output.includes("advisory lock");
  if (!lockTimedOut || attempt === attempts) process.exit(result.status ?? 1);

  const delayMs = 12_000 * attempt;
  console.warn(
    `Outra migração está em andamento. Nova tentativa em ${delayMs / 1_000}s (${attempt}/${attempts}).`,
  );
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}
