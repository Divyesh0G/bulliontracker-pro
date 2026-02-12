
import { GoogleGenAI, Type } from "@google/genai";
import { FxRates, Metal, MetalPrice, Purchase, ProductComparison } from "../types";

const resolveGeminiApiKey = (): string | undefined => {
  const viteKey = import.meta.env?.VITE_GEMINI_API_KEY;
  if (viteKey) {
    return viteKey;
  }
  // Keep compatibility with current Vite define replacement.
  return (process as any)?.env?.API_KEY;
};

const getAiClient = (): GoogleGenAI | null => {
  const apiKey = resolveGeminiApiKey();
  if (!apiKey) {
    return null;
  }
  try {
    return new GoogleGenAI({ apiKey });
  } catch (error) {
    console.error("Failed to initialize Gemini client:", error);
    return null;
  }
};

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
  const relevantPurchases = portfolio.filter(p => p.metal === metal);
  const totalWeight = relevantPurchases.reduce((acc, curr) => acc + curr.weight, 0);
  const totalCost = relevantPurchases.reduce((acc, curr) => acc + curr.pricePaid, 0);
  const avgPrice = totalWeight > 0 ? totalCost / (totalWeight / 31.1035) : 0;

  const prompt = `
    Metal: ${metal}
    Current Yahoo Finance Spot Price: ${currentPrice} ${currency}/oz.
    User's Avg Purchase: ${avgPrice.toFixed(2)} ${currency}/oz.
    Provide a professional recommendation based on this context.
  `;

  try {
    const ai = getAiClient();
    if (!ai) {
      return { recommendation: 'HOLD', reasoning: 'Gemini API key not configured.', targetPrice: currentPrice };
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recommendation: { type: Type.STRING },
            reasoning: { type: Type.STRING },
            targetPrice: { type: Type.NUMBER }
          },
          required: ["recommendation", "reasoning", "targetPrice"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    return { recommendation: 'HOLD', reasoning: 'Analysis unavailable.', targetPrice: currentPrice };
  }
};
