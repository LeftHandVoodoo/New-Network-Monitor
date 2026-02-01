import { spawn } from "node:child_process";

export async function runPowerShell(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command],
      { windowsHide: true }
    );

    let stdout = "";
    let stderr = "";

    if (child.stdout) {
      child.stdout.setEncoding("utf16le");
      child.stdout.on("data", (data) => {
        stdout += data;
      });
    }

    if (child.stderr) {
      child.stderr.setEncoding("utf16le");
      child.stderr.on("data", (data) => {
        stderr += data;
      });
    }

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      const cleanedStdout = stdout.replace(/^\uFEFF/, "").trim();
      const cleanedStderr = stderr.replace(/^\uFEFF/, "").trim();
      if (code === 0) {
        resolve(cleanedStdout);
      } else {
        reject(new Error(cleanedStderr || `PowerShell exited with ${code}`));
      }
    });
  });
}
