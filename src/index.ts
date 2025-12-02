#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  checkHoneypot,
  formatHoneypotResult,
  getSupportedChains,
  isValidAddress,
  normalizeChainId,
} from "./honeypot.js";

const server = new McpServer({
  name: "dex-honeypot-mcp",
  version: "1.0.0",
});

// Register check_honeypot tool
server.registerTool(
  "check_honeypot",
  {
    title: "Check Honeypot",
    description:
      "Check if a token is a honeypot on a decentralized exchange. A honeypot is a token that can be bought but cannot be sold, trapping users' funds. This tool checks buy/sell taxes, trading simulation, and other risk factors.",
    inputSchema: {
      address: z
        .string()
        .describe(
          "The token contract address to check (0x followed by 40 hex characters)"
        ),
      chain: z
        .string()
        .optional()
        .default("1")
        .describe(
          "The blockchain to check on. Can be chain ID (e.g., '1', '56') or name (e.g., 'eth', 'bsc', 'polygon'). Defaults to Ethereum mainnet."
        ),
    },
    outputSchema: {
      isHoneypot: z.boolean().describe("Whether the token is a honeypot"),
      honeypotReason: z.string().optional().describe("Reason for honeypot classification"),
      simulationSuccess: z.boolean().describe("Whether trade simulation was successful"),
      buyTax: z.number().describe("Buy tax as a decimal (0.1 = 10%)"),
      sellTax: z.number().describe("Sell tax as a decimal (0.1 = 10%)"),
      transferTax: z.number().describe("Transfer tax as a decimal (0.1 = 10%)"),
      tokenName: z.string().describe("Name of the token"),
      tokenSymbol: z.string().describe("Symbol of the token"),
      chain: z.string().describe("Chain name"),
      flags: z.array(z.string()).describe("Risk flags identified"),
      formattedResult: z.string().describe("Human-readable formatted result"),
    },
  },
  async ({ address, chain }) => {
    const chainId = chain || "1";

    const result = await checkHoneypot(address, chainId);
    const formattedResult = formatHoneypotResult(result);

    return {
      content: [{ type: "text" as const, text: formattedResult }],
      structuredContent: {
        isHoneypot: result.isHoneypot,
        honeypotReason: result.honeypotReason,
        simulationSuccess: result.simulationSuccess,
        buyTax: result.buyTax,
        sellTax: result.sellTax,
        transferTax: result.transferTax,
        tokenName: result.token.name,
        tokenSymbol: result.token.symbol,
        chain: result.chain,
        flags: result.flags,
        formattedResult,
      },
    };
  }
);

// Register get_token_taxes tool
server.registerTool(
  "get_token_taxes",
  {
    title: "Get Token Taxes",
    description:
      "Get the buy, sell, and transfer taxes for a token. High taxes (especially sell tax) can indicate potential scams or unfair tokenomics.",
    inputSchema: {
      address: z
        .string()
        .describe(
          "The token contract address to check (0x followed by 40 hex characters)"
        ),
      chain: z
        .string()
        .optional()
        .default("1")
        .describe(
          "The blockchain to check on. Can be chain ID or name. Defaults to Ethereum mainnet."
        ),
    },
    outputSchema: {
      buyTax: z.number().describe("Buy tax percentage"),
      sellTax: z.number().describe("Sell tax percentage"),
      transferTax: z.number().describe("Transfer tax percentage"),
      tokenName: z.string().describe("Name of the token"),
      tokenSymbol: z.string().describe("Symbol of the token"),
      warning: z.string().optional().describe("Warning message if taxes are high"),
    },
  },
  async ({ address, chain }) => {
    const chainId = chain || "1";

    const result = await checkHoneypot(address, chainId);

    const buyTaxPct = result.buyTax * 100;
    const sellTaxPct = result.sellTax * 100;
    const transferTaxPct = result.transferTax * 100;

    let warning: string | undefined;
    if (sellTaxPct > 10) {
      warning = `⚠️ High sell tax detected (${sellTaxPct.toFixed(2)}%)! This could significantly impact your ability to sell.`;
    } else if (buyTaxPct > 10) {
      warning = `⚠️ High buy tax detected (${buyTaxPct.toFixed(2)}%)!`;
    }

    const text = `Token: ${result.token.name} (${result.token.symbol})
Buy Tax: ${buyTaxPct.toFixed(2)}%
Sell Tax: ${sellTaxPct.toFixed(2)}%
Transfer Tax: ${transferTaxPct.toFixed(2)}%${warning ? `\n\n${warning}` : ""}`;

    return {
      content: [{ type: "text" as const, text }],
      structuredContent: {
        buyTax: buyTaxPct,
        sellTax: sellTaxPct,
        transferTax: transferTaxPct,
        tokenName: result.token.name,
        tokenSymbol: result.token.symbol,
        warning,
      },
    };
  }
);

// Register list_supported_chains tool
server.registerTool(
  "list_supported_chains",
  {
    title: "List Supported Chains",
    description:
      "Get a list of blockchain networks supported by the honeypot checker.",
    inputSchema: {},
    outputSchema: {
      chains: z.array(z.object({
        name: z.string(),
        chainId: z.string(),
      })),
    },
  },
  async () => {
    const chains = getSupportedChains();
    const text = `Supported Chains:\n${chains.map((c) => `- ${c.name} (Chain ID: ${c.chainId})`).join("\n")}`;

    return {
      content: [{ type: "text" as const, text }],
      structuredContent: { chains },
    };
  }
);

// Register validate_token_address tool
server.registerTool(
  "validate_token_address",
  {
    title: "Validate Token Address",
    description:
      "Validate that a token address is properly formatted for Ethereum-compatible chains.",
    inputSchema: {
      address: z.string().describe("The token address to validate"),
    },
    outputSchema: {
      valid: z.boolean().describe("Whether the address is valid"),
      address: z.string().describe("The address that was validated"),
      message: z.string().describe("Validation result message"),
    },
  },
  async ({ address }) => {
    const valid = isValidAddress(address);
    const message = valid
      ? "Address is valid"
      : "Invalid address format. Must be 0x followed by 40 hexadecimal characters.";

    return {
      content: [{ type: "text" as const, text: `${address}: ${message}` }],
      structuredContent: {
        valid,
        address,
        message,
      },
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("DEX Honeypot MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
