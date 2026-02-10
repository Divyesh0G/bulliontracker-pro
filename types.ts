
export type Metal = 'Gold' | 'Silver' | 'Platinum' | 'Palladium';
export type Currency = 'USD' | 'AUD' | 'INR';

export interface MetalPrice {
  metal: Metal;
  rates: Record<Currency, number>;
  timestamp: number;
}

export interface Purchase {
  id: string;
  metal: Metal;
  form: 'Coin' | 'Bar' | 'Nugget' | 'Other';
  weight: number; // in grams
  pricePaid: number;
  currency: Currency;
  date: string;
  seller: string;
}

export interface Seller {
  name: string;
  url: string;
  location: string;
  pricePremium: number; // Percentage over spot
  rating: number;
}

export interface ProductComparison {
  productName: string;
  metal: Metal;
  weightOz: number;
  offers: Array<{
    sellerName: string;
    price: number;
    url: string;
  }>;
}

export interface MarketAnalysis {
  recommendation: 'STRONG BUY' | 'BUY' | 'HOLD' | 'WAIT';
  reasoning: string;
  targetPrice: number;
}

export interface FxRates {
  INR: number;
  AUD: number;
  timestamp: number;
  source: string;
  tickers: Record<string, string>;
}
