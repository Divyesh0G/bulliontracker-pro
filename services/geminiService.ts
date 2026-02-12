
import { FxRates, Metal, MetalPrice, Purchase, ProductComparison } from "../types";

export const fetchRealTimePrices = async (): Promise<MetalPrice[]> => {
  try {
    const response = await fetch('/api/prices');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch Yahoo Finance prices from backend:", error);
    throw error;
  }
};

export const fetchBullionComparisons = async (): Promise<ProductComparison[]> => {
  try {
    const response = await fetch('/api/comparisons');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch product comparisons:", error);
    return [];
  }
};

export const fetchFxRates = async (): Promise<FxRates> => {
  const response = await fetch('/api/fx');
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return await response.json();
};

export const getMarketAnalysis = async (
  metal: Metal,
  currentPrice: number,
  currency: string,
  portfolio: Purchase[]
) => {
  try {
    const response = await fetch('/api/analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metal, currentPrice, currency, portfolio })
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    return { recommendation: 'HOLD', reasoning: 'Analysis unavailable.', targetPrice: currentPrice };
  }
};
