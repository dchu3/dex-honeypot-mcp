/**
 * Honeypot detection service using external APIs
 */

export interface HoneypotCheckResult {
  isHoneypot: boolean;
  honeypotReason?: string;
  simulationSuccess: boolean;
  simulationError?: string;
  buyTax: number;
  sellTax: number;
  transferTax: number;
  buyGas?: number;
  sellGas?: number;
  token: {
    name: string;
    symbol: string;
    decimals: number;
    totalSupply: string;
  };
  chain: string;
  contractAddress: string;
  pair?: {
    pair: string;
    chainId: string;
    reserves0: string;
    reserves1: string;
    liquidity: number;
    router: string;
    createdAtTimestamp?: string;
  };
  flags: string[];
  holderAnalysis?: {
    holders: number;
    successful: number;
    failed: number;
    siphoned: number;
    averageTax: number;
    averageGas: number;
    highestTax: number;
    highTaxWallets: number;
    taxDistribution: Record<string, number>;
  };
}

export interface HoneypotApiResponse {
  simulationSuccess: boolean;
  simulationError?: string;
  honeypotResult: {
    isHoneypot: boolean;
    honeypotReason?: string;
  };
  simulationResult?: {
    buyTax: number;
    sellTax: number;
    transferTax: number;
    buyGas?: number;
    sellGas?: number;
  };
  token: {
    name: string;
    symbol: string;
    decimals: number;
    totalSupply: string;
  };
  chain: {
    id: string;
    name: string;
    shortName: string;
    currency: string;
  };
  contractAddress: string;
  pair?: {
    pair: string;
    chainId: string;
    reserves0: string;
    reserves1: string;
    liquidity: number;
    router: string;
    createdAtTimestamp?: string;
  };
  flags: string[];
  holderAnalysis?: {
    holders: number;
    successful: number;
    failed: number;
    siphoned: number;
    averageTax: number;
    averageGas: number;
    highestTax: number;
    highTaxWallets: number;
    taxDistribution: Record<string, number>;
  };
}

// Chain ID mapping
export const CHAIN_IDS: Record<string, string> = {
  eth: "1",
  ethereum: "1",
  bsc: "56",
  binance: "56",
  polygon: "137",
  matic: "137",
  arbitrum: "42161",
  arb: "42161",
  base: "8453",
  optimism: "10",
  avalanche: "43114",
  avax: "43114",
  fantom: "250",
  ftm: "250",
};

export function normalizeChainId(chain: string): string {
  const lowerChain = chain.toLowerCase();
  return CHAIN_IDS[lowerChain] || chain;
}

export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Check if a token is a honeypot using the honeypot.is API
 */
export async function checkHoneypot(
  address: string,
  chain: string = "1"
): Promise<HoneypotCheckResult> {
  const chainId = normalizeChainId(chain);

  if (!isValidAddress(address)) {
    throw new Error(
      `Invalid token address: ${address}. Address must be a valid Ethereum-style address (0x followed by 40 hex characters).`
    );
  }

  const url = new URL("https://api.honeypot.is/v2/IsHoneypot");
  url.searchParams.set("address", address);
  url.searchParams.set("chainID", chainId);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(
        `Token not found or not tradeable on chain ${chainId}. The token may not have liquidity or may not exist on this chain.`
      );
    }
    throw new Error(
      `Failed to check honeypot status: ${response.status} ${response.statusText}`
    );
  }

  const data: HoneypotApiResponse = await response.json();

  return {
    isHoneypot: data.honeypotResult.isHoneypot,
    honeypotReason: data.honeypotResult.honeypotReason,
    simulationSuccess: data.simulationSuccess,
    simulationError: data.simulationError,
    buyTax: data.simulationResult?.buyTax ?? 0,
    sellTax: data.simulationResult?.sellTax ?? 0,
    transferTax: data.simulationResult?.transferTax ?? 0,
    buyGas: data.simulationResult?.buyGas,
    sellGas: data.simulationResult?.sellGas,
    token: data.token,
    chain: data.chain.name,
    contractAddress: data.contractAddress,
    pair: data.pair,
    flags: data.flags || [],
    holderAnalysis: data.holderAnalysis,
  };
}

/**
 * Format the honeypot check result as a human-readable string
 */
export function formatHoneypotResult(result: HoneypotCheckResult): string {
  const lines: string[] = [];

  // Header
  lines.push(`# Honeypot Analysis for ${result.token.symbol}`);
  lines.push("");

  // Status
  if (result.isHoneypot) {
    lines.push(`⚠️ **WARNING: This token appears to be a HONEYPOT!**`);
    if (result.honeypotReason) {
      lines.push(`Reason: ${result.honeypotReason}`);
    }
  } else {
    lines.push(`✅ **This token does NOT appear to be a honeypot.**`);
  }
  lines.push("");

  // Token info
  lines.push(`## Token Information`);
  lines.push(`- **Name:** ${result.token.name}`);
  lines.push(`- **Symbol:** ${result.token.symbol}`);
  lines.push(`- **Decimals:** ${result.token.decimals}`);
  lines.push(`- **Contract:** ${result.contractAddress}`);
  lines.push(`- **Chain:** ${result.chain}`);
  lines.push("");

  // Tax info
  lines.push(`## Tax Analysis`);
  lines.push(`- **Buy Tax:** ${(result.buyTax * 100).toFixed(2)}%`);
  lines.push(`- **Sell Tax:** ${(result.sellTax * 100).toFixed(2)}%`);
  lines.push(`- **Transfer Tax:** ${(result.transferTax * 100).toFixed(2)}%`);

  if (result.buyGas) {
    lines.push(`- **Buy Gas:** ${result.buyGas.toLocaleString()}`);
  }
  if (result.sellGas) {
    lines.push(`- **Sell Gas:** ${result.sellGas.toLocaleString()}`);
  }
  lines.push("");

  // Simulation status
  lines.push(`## Simulation`);
  if (result.simulationSuccess) {
    lines.push(`✅ Trade simulation successful`);
  } else {
    lines.push(`❌ Trade simulation failed`);
    if (result.simulationError) {
      lines.push(`Error: ${result.simulationError}`);
    }
  }
  lines.push("");

  // Pair info
  if (result.pair) {
    lines.push(`## Liquidity Pair`);
    lines.push(`- **Pair Address:** ${result.pair.pair}`);
    lines.push(`- **Liquidity:** $${result.pair.liquidity.toLocaleString()}`);
    lines.push(`- **Router:** ${result.pair.router}`);
    if (result.pair.createdAtTimestamp) {
      const createdDate = new Date(
        parseInt(result.pair.createdAtTimestamp, 10) * 1000
      );
      lines.push(`- **Created:** ${createdDate.toISOString()}`);
    }
    lines.push("");
  }

  // Flags
  if (result.flags && result.flags.length > 0) {
    lines.push(`## Risk Flags`);
    for (const flag of result.flags) {
      lines.push(`- ⚠️ ${flag}`);
    }
    lines.push("");
  }

  // Holder analysis
  if (result.holderAnalysis) {
    const ha = result.holderAnalysis;
    lines.push(`## Holder Analysis`);
    lines.push(`- **Total Holders Analyzed:** ${ha.holders}`);
    lines.push(`- **Successful Transactions:** ${ha.successful}`);
    lines.push(`- **Failed Transactions:** ${ha.failed}`);
    lines.push(`- **Siphoned:** ${ha.siphoned}`);
    lines.push(`- **Average Tax:** ${(ha.averageTax * 100).toFixed(2)}%`);
    lines.push(`- **Highest Tax:** ${(ha.highestTax * 100).toFixed(2)}%`);
    lines.push(`- **High Tax Wallets:** ${ha.highTaxWallets}`);
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Get a list of supported chains
 */
export function getSupportedChains(): Array<{ name: string; chainId: string }> {
  return [
    { name: "Ethereum", chainId: "1" },
    { name: "Binance Smart Chain", chainId: "56" },
    { name: "Polygon", chainId: "137" },
    { name: "Arbitrum One", chainId: "42161" },
    { name: "Base", chainId: "8453" },
    { name: "Optimism", chainId: "10" },
    { name: "Avalanche", chainId: "43114" },
    { name: "Fantom", chainId: "250" },
  ];
}
