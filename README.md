# dex-honeypot-mcp

An MCP server that detects potential honeypot tokens on Ethereum, BSC, and Base using the [honeypot.is](https://honeypot.is) API.

## Installation

```bash
npm install
npm run build
```

## Configuration

Add to your MCP client config:

```json
{
  "mcpServers": {
    "dex-honeypot-mcp": {
      "command": "node",
      "args": ["/path/to/dex-honeypot-mcp/dist/index.js"],
      "env": {
        "HONEYPOT_API_KEY": "optional-api-key"
      }
    }
  }
}
```

## Tool

### check_honeypot

Check if a token is a honeypot.

**Parameters:**
- `address` (required): Token contract address (0x...)
- `chain` (optional): `ethereum`, `bsc`, or `base` (auto-detects if omitted)

**Example:**
```
Check if 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 is a honeypot on ethereum
```

**Output:**
```markdown
# Honeypot Analysis for USDC
- **Address**: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
- **Chain**: Ethereum
- **Is Honeypot**: false
- **Risk Level**: low
- **Buy Tax**: 0%
- **Sell Tax**: 0%
- **Transfer Tax**: 0%
- **Contract Open Source**: true
```

## License

MIT