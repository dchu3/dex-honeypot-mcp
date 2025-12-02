import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  normalizeChainId,
  isValidAddress,
  getSupportedChains,
  formatHoneypotResult,
  type HoneypotCheckResult,
} from "./honeypot.js";

describe("normalizeChainId", () => {
  it("should return chain ID for known chain names", () => {
    expect(normalizeChainId("eth")).toBe("1");
    expect(normalizeChainId("ethereum")).toBe("1");
    expect(normalizeChainId("bsc")).toBe("56");
    expect(normalizeChainId("binance")).toBe("56");
    expect(normalizeChainId("polygon")).toBe("137");
    expect(normalizeChainId("matic")).toBe("137");
    expect(normalizeChainId("arbitrum")).toBe("42161");
    expect(normalizeChainId("arb")).toBe("42161");
    expect(normalizeChainId("base")).toBe("8453");
    expect(normalizeChainId("optimism")).toBe("10");
    expect(normalizeChainId("avalanche")).toBe("43114");
    expect(normalizeChainId("avax")).toBe("43114");
    expect(normalizeChainId("fantom")).toBe("250");
    expect(normalizeChainId("ftm")).toBe("250");
  });

  it("should be case-insensitive", () => {
    expect(normalizeChainId("ETH")).toBe("1");
    expect(normalizeChainId("BSC")).toBe("56");
    expect(normalizeChainId("Polygon")).toBe("137");
  });

  it("should return input if chain name is unknown", () => {
    expect(normalizeChainId("1")).toBe("1");
    expect(normalizeChainId("56")).toBe("56");
    expect(normalizeChainId("unknown")).toBe("unknown");
  });
});

describe("isValidAddress", () => {
  it("should return true for valid addresses", () => {
    expect(isValidAddress("0x1234567890123456789012345678901234567890")).toBe(
      true
    );
    expect(isValidAddress("0xabcdefABCDEF1234567890123456789012345678")).toBe(
      true
    );
    expect(isValidAddress("0x0000000000000000000000000000000000000000")).toBe(
      true
    );
  });

  it("should return false for invalid addresses", () => {
    expect(isValidAddress("")).toBe(false);
    expect(isValidAddress("0x")).toBe(false);
    expect(isValidAddress("0x123")).toBe(false);
    expect(isValidAddress("1234567890123456789012345678901234567890")).toBe(
      false
    );
    expect(isValidAddress("0xGGGG567890123456789012345678901234567890")).toBe(
      false
    );
    expect(
      isValidAddress("0x12345678901234567890123456789012345678901")
    ).toBe(false); // 41 chars
    expect(isValidAddress("0x123456789012345678901234567890123456789")).toBe(
      false
    ); // 39 chars
  });
});

describe("getSupportedChains", () => {
  it("should return an array of supported chains", () => {
    const chains = getSupportedChains();
    expect(Array.isArray(chains)).toBe(true);
    expect(chains.length).toBeGreaterThan(0);
  });

  it("should include common chains", () => {
    const chains = getSupportedChains();
    const chainIds = chains.map((c) => c.chainId);

    expect(chainIds).toContain("1"); // Ethereum
    expect(chainIds).toContain("56"); // BSC
    expect(chainIds).toContain("137"); // Polygon
  });

  it("should have name and chainId for each chain", () => {
    const chains = getSupportedChains();
    for (const chain of chains) {
      expect(chain).toHaveProperty("name");
      expect(chain).toHaveProperty("chainId");
      expect(typeof chain.name).toBe("string");
      expect(typeof chain.chainId).toBe("string");
    }
  });
});

describe("formatHoneypotResult", () => {
  const baseResult: HoneypotCheckResult = {
    isHoneypot: false,
    simulationSuccess: true,
    buyTax: 0.01,
    sellTax: 0.02,
    transferTax: 0,
    buyGas: 150000,
    sellGas: 200000,
    token: {
      name: "Test Token",
      symbol: "TEST",
      decimals: 18,
      totalSupply: "1000000000000000000000000",
    },
    chain: "Ethereum",
    contractAddress: "0x1234567890123456789012345678901234567890",
    flags: [],
  };

  it("should format a safe token result", () => {
    const formatted = formatHoneypotResult(baseResult);

    expect(formatted).toContain("Test Token");
    expect(formatted).toContain("TEST");
    expect(formatted).toContain("does NOT appear to be a honeypot");
    expect(formatted).toContain("1.00%"); // Buy tax
    expect(formatted).toContain("2.00%"); // Sell tax
  });

  it("should format a honeypot result with warning", () => {
    const honeypotResult: HoneypotCheckResult = {
      ...baseResult,
      isHoneypot: true,
      honeypotReason: "Cannot sell",
    };

    const formatted = formatHoneypotResult(honeypotResult);

    expect(formatted).toContain("WARNING");
    expect(formatted).toContain("HONEYPOT");
    expect(formatted).toContain("Cannot sell");
  });

  it("should include simulation status", () => {
    const failedSimResult: HoneypotCheckResult = {
      ...baseResult,
      simulationSuccess: false,
      simulationError: "Insufficient liquidity",
    };

    const formatted = formatHoneypotResult(failedSimResult);

    expect(formatted).toContain("simulation failed");
    expect(formatted).toContain("Insufficient liquidity");
  });

  it("should include flags when present", () => {
    const resultWithFlags: HoneypotCheckResult = {
      ...baseResult,
      flags: ["HIGH_BUY_TAX", "LOW_LIQUIDITY"],
    };

    const formatted = formatHoneypotResult(resultWithFlags);

    expect(formatted).toContain("HIGH_BUY_TAX");
    expect(formatted).toContain("LOW_LIQUIDITY");
  });

  it("should include pair information when present", () => {
    const resultWithPair: HoneypotCheckResult = {
      ...baseResult,
      pair: {
        pair: "0xabcd...",
        chainId: "1",
        reserves0: "1000000",
        reserves1: "500000",
        liquidity: 50000,
        router: "0xrouter...",
      },
    };

    const formatted = formatHoneypotResult(resultWithPair);

    expect(formatted).toContain("Liquidity Pair");
    expect(formatted).toContain("50,000");
  });

  it("should include holder analysis when present", () => {
    const resultWithHolders: HoneypotCheckResult = {
      ...baseResult,
      holderAnalysis: {
        holders: 100,
        successful: 90,
        failed: 10,
        siphoned: 0,
        averageTax: 0.02,
        averageGas: 150000,
        highestTax: 0.05,
        highTaxWallets: 5,
        taxDistribution: {},
      },
    };

    const formatted = formatHoneypotResult(resultWithHolders);

    expect(formatted).toContain("Holder Analysis");
    expect(formatted).toContain("100");
    expect(formatted).toContain("90");
  });
});
