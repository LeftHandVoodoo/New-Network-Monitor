# Network Monitor

Windows desktop GUI app that monitors internet connectivity and resets the network adapter on disconnect.

## Installation

```powershell
npm install
```

## Usage

```powershell
Copy-Item .env.example .env
# Update IPC_TOKEN and VITE_IPC_TOKEN to the same value.
# Set AUTO_RESET_ENABLED=false to prevent resets while testing.
.\scripts\start-agent.ps1
npm run dev
```

The agent is a single local process started on demand (no Windows service or installer).

You can also launch both agent and UI with:

```powershell
python .\scripts\start-app.py
```

## Documentation

- [Architecture Overview](docs/architecture.md)
- [API Reference](docs/api.md)
- [Decision Records](docs/adr/)

## Development

```powershell
npm run lint
npm run typecheck
npm run test
npm run build
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

See [LICENSE](LICENSE) for details.
