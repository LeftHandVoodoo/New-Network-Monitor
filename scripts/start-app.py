from __future__ import annotations

import os
import shutil
import subprocess
import sys
from pathlib import Path


def load_env(path: Path) -> dict[str, str]:
    data: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        if "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        value = value.strip()
        if value.startswith("\"") and value.endswith("\""):
            value = value[1:-1]
        data[key.strip()] = value
    return data


def parse_int(value: str | None, fallback: int) -> int:
    try:
        return int(value) if value is not None else fallback
    except ValueError:
        return fallback


def ensure_env(root: Path) -> Path:
    env_path = root / ".env"
    example_path = root / ".env.example"
    if env_path.exists():
        return env_path
    if not example_path.exists():
        print("Missing .env and .env.example. Aborting.")
        sys.exit(1)
    shutil.copyfile(example_path, env_path)
    print("Created .env from .env.example.")
    print("Update IPC_TOKEN and VITE_IPC_TOKEN to the same value before continuing.")
    return env_path


def start_agent(root: Path, env: dict[str, str]) -> None:
    ps_script = root / "scripts" / "start-agent.ps1"
    if not ps_script.exists():
        print("Missing scripts/start-agent.ps1. Aborting.")
        sys.exit(1)

    ipc_token = env.get("IPC_TOKEN", "").strip()
    if not ipc_token:
        print("IPC_TOKEN is required in .env to start the agent.")
        sys.exit(1)

    agent_port = parse_int(env.get("VITE_AGENT_PORT"), 8787)
    ping_target = env.get("PING_TARGET", "8.8.8.8")
    retry_count = parse_int(env.get("RETRY_COUNT"), 3)
    retry_interval = parse_int(env.get("RETRY_INTERVAL_MS"), 5000)

    args = [
        "powershell.exe",
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        str(ps_script),
        "-Port",
        str(agent_port),
        "-IpcToken",
        ipc_token,
        "-PingTarget",
        ping_target,
        "-RetryCount",
        str(retry_count),
        "-RetryIntervalMs",
        str(retry_interval)
    ]

    print("Starting agent (UAC prompt expected)...")
    subprocess.Popen(args, cwd=str(root))


def start_ui(root: Path) -> int:
    npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
    print("Starting UI dev server...")
    result = subprocess.run([npm_cmd, "run", "dev"], cwd=str(root))
    return result.returncode


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    env_path = ensure_env(root)
    env = load_env(env_path)

    vite_token = env.get("VITE_IPC_TOKEN", "").strip()
    ipc_token = env.get("IPC_TOKEN", "").strip()
    if vite_token and ipc_token and vite_token != ipc_token:
        print("Warning: VITE_IPC_TOKEN does not match IPC_TOKEN.")
        print("Update .env so they match for the UI to connect.")

    start_agent(root, env)
    return start_ui(root)


if __name__ == "__main__":
    raise SystemExit(main())
