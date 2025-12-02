# DEX Honeypot MCP Server

An MCP (Model Context Protocol) server for checking if cryptocurrency tokens are honeypots on decentralized exchanges.

## What is a Honeypot?

A honeypot token is a type of cryptocurrency scam where users can buy a token but cannot sell it. The token contract contains malicious code that prevents selling, trapping investors' funds. This server helps identify such tokens before you invest.

## Features

- **Honeypot Detection**: Check if a token is a honeypot that prevents selling
- **Tax Analysis**: Get buy, sell, and transfer tax percentages
- **Multi-Chain Support**: Works with Ethereum, BSC, Polygon, Arbitrum, Base, and more
- **Risk Flags**: Identify potential red flags in token contracts
- **Liquidity Analysis**: View pair and liquidity information
- **Holder Analysis**: Analyze transaction success rates among token holders

## Installation

```bash
npm install
npm run build
```

## Usage

### Running the Server

```bash
node dist/index.js
```

### MCP Configuration

Add to your MCP client configuration:

```json
{
  "mcpServers": {
    "dex-honeypot": {
      "command": "node",
      "args": ["/path/to/dex-honeypot-mcp/dist/index.js"]
    }
  }
}
```

## Available Tools

### `check_honeypot`

Check if a token is a honeypot.

**Parameters:**
- `address` (required): Token contract address (0x...)
- `chain` (optional): Blockchain name or chain ID (default: "1" for Ethereum)

**Example:**
```
Check honeypot for address 0x... on BSC
```

### `get_token_taxes`

Get the buy, sell, and transfer taxes for a token.

**Parameters:**
- `address` (required): Token contract address
- `chain` (optional): Blockchain name or chain ID

### `list_supported_chains`

Get a list of all supported blockchain networks.

### `validate_token_address`

Validate that a token address is properly formatted.

**Parameters:**
- `address` (required): The address to validate

## Supported Chains

| Chain | Chain ID | Aliases |
|-------|----------|---------|
| Ethereum | 1 | eth, ethereum |
| Binance Smart Chain | 56 | bsc, binance |
| Polygon | 137 | polygon, matic |
| Arbitrum One | 42161 | arbitrum, arb |
| Base | 8453 | base |
| Optimism | 10 | optimism |
| Avalanche | 43114 | avalanche, avax |
| Fantom | 250 | fantom, ftm |

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Watch mode (for development)
npm run watch
```

## API

This server uses the [honeypot.is](https://honeypot.is) API for honeypot detection.

## License

MIT