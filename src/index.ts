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
    throw new Error("Invalid address format");
  }

  const params = new URLSearchParams({ address });
  if (chain) params.set("chainID", String(CHAINS[chain]));

  const headers: Record<string, string> = {};
  if (API_KEY) headers["X-API-KEY"] = API_KEY;

  const res = await fetch(`${API_URL}?${params}`, { headers });
  if (!res.ok) throw new Error(`API error: ${res.status}`);

  const data: HoneypotResponse = await res.json();

  const tokenName = data.token?.name ?? "Unknown";
  const isHoneypot = data.honeypotResult?.isHoneypot ?? false;
  const risk = data.summary?.risk ?? "unknown";
  const buyTax = data.simulationResult?.buyTax ?? "N/A";
  const sellTax = data.simulationResult?.sellTax ?? "N/A";
  const transferTax = data.simulationResult?.transferTax ?? "N/A";
  const openSource = data.contractCode?.openSource ?? "Unknown";
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
  async ({ address, chain }) => ({
    content: [{ type: "text", text: await checkHoneypot(address, chain) }],
  })
);

const transport = new StdioServerTransport();
server.connect(transport);
