import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const CHAINS = { ethereum: 1, bsc: 56, base: 8453 } as const;
type Chain = keyof typeof CHAINS;

const API_URL = "https://api.honeypot.is/v2/IsHoneypot";
const API_KEY = process.env.HONEYPOT_API_KEY;

interface HoneypotResponse {
  token?: { name?: string };
  honeypotResult?: { isHoneypot?: boolean };
  summary?: { risk?: string };
  simulationResult?: { buyTax?: number; sellTax?: number; transferTax?: number };
  contractCode?: { openSource?: boolean };
  chain?: { name?: string };
}

async function checkHoneypot(address: string, chain?: Chain): Promise<string> {
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    throw new Error("Invalid address format. Expected a 40-character hexadecimal address starting with '0x'");
  }

  const params = new URLSearchParams({ address });
  if (chain) params.set("chainID", String(CHAINS[chain]));

  const headers: Record<string, string> = {};
  if (API_KEY) headers["X-API-KEY"] = API_KEY;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);
  let res: Response;
  try {
    res = await fetch(`${API_URL}?${params}`, { headers, signal: controller.signal });
    clearTimeout(timeoutId);
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("API request timed out");
    }
    throw error;
  }

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(`API error: ${res.status} ${res.statusText}${errorText ? `. ${errorText}` : ""}`);
  }

  const data: HoneypotResponse = await res.json();

  const tokenName = data.token?.name ?? "Unknown";
  const isHoneypot = data.honeypotResult?.isHoneypot ?? false;
  const risk = data.summary?.risk ?? "unknown";
  const buyTax = data.simulationResult?.buyTax?.toString() ?? "N/A";
  const sellTax = data.simulationResult?.sellTax?.toString() ?? "N/A";
  const transferTax = data.simulationResult?.transferTax?.toString() ?? "N/A";
  const openSource = data.contractCode?.openSource !== undefined
    ? data.contractCode.openSource
    : "Unknown";
  const chainName = data.chain?.name ?? chain ?? "auto-detected";

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
