import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const CHAINS = { ethereum: 1, bsc: 56, base: 8453 } as const;
type Chain = keyof typeof CHAINS;

const API_URL = "https://api.honeypot.is/v2/IsHoneypot";
const API_KEY = process.env.HONEYPOT_API_KEY;
const REQUEST_TIMEOUT_MS = 30000;

interface HoneypotResponse {
  token?: { name?: string };
  honeypotResult?: { isHoneypot?: boolean };
  summary?: { risk?: string };
  simulationResult?: { buyTax?: number; sellTax?: number; transferTax?: number };
  contractCode?: { openSource?: boolean };
  chain?: { name?: string };
}

/** Sanitize string for safe markdown output */
function sanitize(str: string): string {
  return str.replace(/[*_`#\[\]]/g, "");
}

/**
 * Checks whether a token address is a honeypot on a specified blockchain.
 * @param address - Token contract address (40-char hex starting with 0x)
 * @param chain - Optional chain to query (auto-detects if omitted)
 * @returns Markdown-formatted honeypot analysis
 * @throws Error on invalid address, timeout, or API error
 */
async function checkHoneypot(address: string, chain?: Chain): Promise<string> {
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    throw new Error("Invalid address format. Expected a 40-character hexadecimal address starting with '0x'");
  }

  const params = new URLSearchParams({ address });
  if (chain) params.set("chainID", String(CHAINS[chain]));

  const headers: Record<string, string> = {};
  if (API_KEY) headers["X-API-KEY"] = API_KEY;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${API_URL}?${params}`, { headers, signal: controller.signal });
    clearTimeout(timeoutId);
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`API request timed out after ${REQUEST_TIMEOUT_MS / 1000} seconds`);
    }
    throw error;
  }

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(`API error: ${res.status} ${res.statusText}${errorText ? `. ${errorText}` : ""}`);
  }

  let data: HoneypotResponse;
  try {
    data = await res.json();
  } catch {
    throw new Error("Failed to parse API response");
  }

  const tokenName = sanitize(data.token?.name ?? "Unknown");
  const isHoneypot = data.honeypotResult?.isHoneypot ? "Yes" : "No";
  const risk = sanitize(data.summary?.risk ?? "unknown");
  // Tax values from API are already percentages (e.g., 5 = 5%)
  const buyTax = data.simulationResult?.buyTax?.toString() ?? "N/A";
  const sellTax = data.simulationResult?.sellTax?.toString() ?? "N/A";
  const transferTax = data.simulationResult?.transferTax?.toString() ?? "N/A";
  const openSource = data.contractCode?.openSource === true ? "Yes"
    : data.contractCode?.openSource === false ? "No" : "Unknown";
  const chainName = sanitize(data.chain?.name ?? chain ?? "auto-detected");

  return `# Honeypot Analysis for ${tokenName}
- **Address**: ${address}
- **Chain**: ${chainName}
- **Is Honeypot**: ${isHoneypot}
- **Risk Level**: ${risk}
- **Buy Tax**: ${buyTax}%
- **Sell Tax**: ${sellTax}%
- **Transfer Tax**: ${transferTax}%
- **Contract Open Source**: ${openSource}`;
}

const server = new McpServer({
  name: "dex-honeypot-mcp",
  version: "0.1.0",
});

server.tool(
  "check_honeypot",
  "Check if a token is a honeypot using honeypot.is API. Supports Ethereum, BSC, and Base.",
  {
    address: z.string().describe("Token contract address (0x...)"),
    chain: z.enum(["ethereum", "bsc", "base"]).optional().describe("Chain to check (auto-detects if omitted)"),
  },
  async ({ address, chain }) => {
    try {
      return {
        content: [{ type: "text", text: await checkHoneypot(address, chain) }],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error occurred";
      return {
        content: [{ type: "text", text: `❌ Error: ${message}` }],
        isError: true,
      };
    }
  }
);

const transport = new StdioServerTransport();
server.connect(transport);
