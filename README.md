# Conductor

**Configure your MCP servers once. Use them everywhere.**

Conductor is a local-first desktop app that manages [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server configurations across every major AI coding tool. One source of truth, automatic sync, secrets in your system keychain.

## Supported Clients

| Client | Format | Status |
|--------|--------|--------|
| Claude Desktop | JSON | Supported |
| Cursor | JSON | Supported |
| VS Code (Copilot) | JSON | Supported |
| Claude Code CLI | JSON | Supported |
| Windsurf | JSON | Supported |
| Zed | JSON | Supported |
| JetBrains | XML | Experimental |
| OpenAI Codex CLI | TOML | Experimental |

## Features

- **Single Source of Truth** — Manage all your MCP servers in one place
- **Auth Once, Use Everywhere** — Authenticate via OAuth once, Conductor injects credentials into every client
- **MCP Stacks** — Share your entire MCP setup as a one-click-install bundle
- **Auto-Sync** — Changes propagate to all clients automatically
- **Keychain Secrets** — API keys stored in macOS Keychain, never in plaintext config files
- **Format Translation** — Automatically handles JSON, TOML, XML differences between clients
- **Backup & Safety** — Timestamped backups before every config write
- **Registry Browse** — Search and install from 7,300+ MCP servers on Smithery

## Installation

### Download

Download the latest `.dmg` from [GitHub Releases](https://github.com/conductor-mcp/conductor/releases).

### Homebrew

```bash
brew install --cask conductor-mcp
```

## How It Works

```
                    ┌─────────────┐
                    │  Conductor  │
                    │  (master    │
                    │   config)   │
                    └──────┬──────┘
                           │
           ┌───────┬───────┼───────┬───────┐
           ▼       ▼       ▼       ▼       ▼
        Claude  Cursor  VS Code  Wind-   Claude
        Desktop                  surf    Code
```

1. **Import** — Conductor scans your installed AI tools and imports existing MCP server configs
2. **Manage** — Add, edit, and organize servers in one UI. Secrets go to your system keychain.
3. **Sync** — Push your config to every client with one click. Format differences handled automatically.

## Architecture

```
conductor/
├── apps/
│   ├── desktop/          # Tauri v2 + React + TypeScript
│   │   ├── src/          # React frontend (Tailwind, Zustand)
│   │   └── src-tauri/    # Rust backend
│   └── web/              # Next.js landing page
├── packages/
│   └── types/            # Shared TypeScript types
└── package.json
```

### Config Paths (macOS)

| Client | Config File |
|--------|------------|
| Claude Desktop | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Cursor | `~/.cursor/mcp.json` |
| VS Code | `~/Library/Application Support/Code/User/settings.json` |
| Claude Code | `~/.claude/settings.json` |
| Windsurf | `~/.codeium/windsurf/mcp_config.json` |
| Zed | `~/.config/zed/settings.json` |
| JetBrains | `~/Library/Application Support/JetBrains/*/options/mcp.xml` |
| Codex | `~/.codex/config.toml` |

Conductor stores its own config at `~/.conductor/config.json`.

## Development

### Prerequisites

- Rust 1.75+
- Node.js 20+
- pnpm 9+
- Xcode Command Line Tools

### Setup

```bash
git clone https://github.com/conductor-mcp/conductor.git
cd conductor
pnpm install
cargo install tauri-cli
```

### Run

```bash
# Desktop app (Tauri + React)
pnpm dev:desktop

# Landing page (Next.js)
pnpm dev:web
```

### Build

```bash
# Desktop app (.dmg)
pnpm build:desktop

# Landing page
pnpm build:web
```

## Contributing

Contributions are welcome. Please open an issue first to discuss what you'd like to change.

## License

MIT
