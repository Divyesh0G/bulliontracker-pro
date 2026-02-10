import { createServer } from "node:http";
import { URL } from "node:url";

const METAL_TICKERS = {
  // Prefer spot, fall back to futures if spot pair is unavailable.
  Gold: ["XAUUSD=X", "GC=F"],
  Silver: ["XAGUSD=X", "SI=F"],
  Platinum: ["XPTUSD=X", "PL=F"],
  Palladium: ["XPDUSD=X", "PA=F"],
};

const FX_TICKERS = {
  INR: "INR=X", // USD/INR (1 USD in INR)
  AUD: "AUD=X", // USD/AUD (1 USD in AUD)
};

const CACHE_POLICY = {
  pricesMs: Number(process.env.PRICES_CACHE_MS ?? 60_000),
  comparisonsMs: Number(process.env.COMPARISONS_CACHE_MS ?? 86_400_000),
  tickerMs: Number(process.env.TICKER_CACHE_MS ?? 60_000),
  fxMs: Number(process.env.FX_CACHE_MS ?? 60_000),
};

let cachedPrices = null;
let lastFetchAt = 0;
const tickerCache = new Map();
let cachedComparisons = null;
let comparisonsFetchedAt = 0;
let cachedFx = null;
let fxFetchedAt = 0;

const SELLERS = [
  {
    name: "ABC Bullion",
    baseUrl: "https://www.abcbullion.com.au",
    urls: [
      "https://www.abcbullion.com.au/store/",
      "https://www.abcbullion.com.au/store/Bullion-Coins",
      "https://www.abcbullion.com.au/store/abc-bullion-platinum",
      "https://www.abcbullion.com.au/store/palladium",
    ],
  },
  {
    name: "Perth Mint",
    baseUrl: "https://www.perthmint.com",
    urls: [
      "https://www.perthmint.com/shop",
      "https://www.perthmint.com/shop/bullion",
      "https://www.perthmint.com/shop/coins",
      "https://www.perthmint.com/shop/bars",
    ],
  },
  {
    name: "Bullion Money",
    baseUrl: "https://bullionmoney.com.au",
    urls: [
      "https://bullionmoney.com.au/collections/all",
      "https://bullionmoney.com.au/collections/bullion",
      "https://bullionmoney.com.au/collections/coins",
      "https://bullionmoney.com.au/collections/bars",
    ],
  },
  {
    name: "Jaggards",
    baseUrl: "https://jaggards.com.au",
    urls: [
      "https://jaggards.com.au/collections/all",
      "https://jaggards.com.au/collections/bullion",
      "https://jaggards.com.au/collections/coins",
      "https://jaggards.com.au/collections/bars",
    ],
  },
  {
    name: "As Good As Gold",
    baseUrl: "https://asgoodasgoldaus.com.au",
    urls: [
      "https://asgoodasgoldaus.com.au/collections/all",
      "https://asgoodasgoldaus.com.au/collections/bullion",
      "https://asgoodasgoldaus.com.au/collections/coins",
      "https://asgoodasgoldaus.com.au/collections/bars",
    ],
  },
  {
    name: "KJC Bullion",
    baseUrl: "https://kjc-gold-silver-bullion.com.au",
    urls: [
      "https://kjc-gold-silver-bullion.com.au/collections/all",
      "https://kjc-gold-silver-bullion.com.au/collections/bullion",
      "https://kjc-gold-silver-bullion.com.au/collections/coins",
      "https://kjc-gold-silver-bullion.com.au/collections/bars",
    ],
  },
  {
    name: "Swan Bullion",
    baseUrl: "https://swanbullion.com",
    urls: [
      "https://swanbullion.com/collections/all",
      "https://swanbullion.com/collections/bullion",
      "https://swanbullion.com/collections/coins",
      "https://swanbullion.com/collections/bars",
    ],
  },
  {
    name: "Bulk Bullion",
    baseUrl: "https://bulkbullion.com.au",
    urls: [
      "https://bulkbullion.com.au/collections/all",
      "https://bulkbullion.com.au/collections/bullion",
      "https://bulkbullion.com.au/collections/coins",
      "https://bulkbullion.com.au/collections/bars",
    ],
  },
];

const sendJson = (res, statusCode, body) => {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(body));
};

const getLastNumericValue = (values = []) => {
  for (let i = values.length - 1; i >= 0; i -= 1) {
    const value = values[i];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }
  return null;
};

const getCachedTickerValue = (ticker) => {
  const cached = tickerCache.get(ticker);
  if (!cached) {
    return null;
  }
  if (Date.now() - cached.timestamp <= CACHE_POLICY.tickerMs) {
    return cached.value;
  }
  return null;
};

const setCachedTickerValue = (ticker, value) => {
  tickerCache.set(ticker, { value, timestamp: Date.now() });
};

const fetchYahooPrice = async (ticker) => {
  const cachedValue = getCachedTickerValue(ticker);
  if (cachedValue !== null) {
    return cachedValue;
  }

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    ticker
  )}?interval=1d&range=5d`;

  let response;
  try {
    response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "application/json",
      },
    });
  } catch (error) {
    const stale = tickerCache.get(ticker);
    if (stale?.value != null) {
      return stale.value;
    }
    throw error;
  }

  if (!response.ok) {
    const stale = tickerCache.get(ticker);
    if (stale?.value != null) {
      return stale.value;
    }
    throw new Error(`Yahoo request failed for ${ticker} (${response.status})`);
  }

  const data = await response.json();
  const result = data?.chart?.result?.[0];
  const regularMarketPrice = result?.meta?.regularMarketPrice;
  if (typeof regularMarketPrice === "number" && Number.isFinite(regularMarketPrice)) {
    setCachedTickerValue(ticker, regularMarketPrice);
    return regularMarketPrice;
  }

  const closes = result?.indicators?.quote?.[0]?.close;
  const fallback = getLastNumericValue(closes);
  if (fallback !== null) {
    setCachedTickerValue(ticker, fallback);
    return fallback;
  }

  throw new Error(`No valid price found for ${ticker}`);
};

const convertUsdToInr = (usd, inrRate) => {
  if (!Number.isFinite(inrRate) || inrRate <= 0) {
    throw new Error("Invalid INR rate");
  }
  return usd * inrRate;
};

const convertUsdToAud = (usd, audRate) => {
  if (!Number.isFinite(audRate) || audRate <= 0) {
    throw new Error("Invalid AUD rate");
  }
  // AUD=X is USD/AUD (1 USD in AUD), so multiply.
  return usd * audRate;
};

const fetchMetalUsdPrice = async (tickers) => {
  let lastError = null;
  for (const ticker of tickers) {
    try {
      return await fetchYahooPrice(ticker);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("Failed to fetch metal price");
};

const fetchSpotRates = async () => {
  const now = Date.now();
  if (cachedPrices && now - lastFetchAt < CACHE_POLICY.pricesMs) {
    return cachedPrices;
  }

  const [inrRate, audRate] = await Promise.all([
    fetchYahooPrice(FX_TICKERS.INR),
    fetchYahooPrice(FX_TICKERS.AUD),
  ]);

  if (!inrRate || !audRate) {
    throw new Error("Invalid FX rates from Yahoo");
  }

  const metalEntries = Object.entries(METAL_TICKERS);
  const metalUsdPrices = await Promise.all(
    metalEntries.map(async ([metal, tickers]) => {
      const usd = await fetchMetalUsdPrice(tickers);
      return [metal, usd];
    })
  );

  const timestamp = Date.now();
  cachedPrices = metalUsdPrices.map(([metal, usd]) => {
    const priceUsd = Number(usd);
    const priceInr = convertUsdToInr(priceUsd, inrRate);
    const priceAud = convertUsdToAud(priceUsd, audRate);
    return {
      metal,
      rates: {
        USD: priceUsd,
        AUD: priceAud,
        INR: priceInr,
      },
      timestamp,
    };
  });
  lastFetchAt = now;

  return cachedPrices;
};

const fetchFxSnapshot = async () => {
  const now = Date.now();
  if (cachedFx && now - fxFetchedAt < CACHE_POLICY.fxMs) {
    return cachedFx;
  }

  const [inrRate, audRate] = await Promise.all([
    fetchYahooPrice(FX_TICKERS.INR),
    fetchYahooPrice(FX_TICKERS.AUD),
  ]);
  cachedFx = {
    INR: inrRate,
    AUD: audRate,
    timestamp: Date.now(),
    source: "Yahoo Finance",
    tickers: FX_TICKERS,
  };
  fxFetchedAt = now;
  return cachedFx;
};

const decodeHtmlEntities = (value) => {
  if (!value) {
    return "";
  }
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
};

const stripTags = (value) => value.replace(/<[^>]*>/g, "");

const normalizeWhitespace = (value) => value.replace(/\s+/g, " ").trim();

const parseMetalFromName = (name) => {
  const lowered = name.toLowerCase();
  if (lowered.includes("gold")) return "Gold";
  if (lowered.includes("silver")) return "Silver";
  if (lowered.includes("platinum")) return "Platinum";
  if (lowered.includes("palladium")) return "Palladium";
  return null;
};

const parseWeightOz = (name) => {
  const text = name.toLowerCase();
  const combiMatch = text.match(/(\d+)\s*x\s*(\d+(?:\.\d+)?)\s*g/);
  if (combiMatch) {
    const count = Number(combiMatch[1]);
    const gramsEach = Number(combiMatch[2]);
    if (Number.isFinite(count) && Number.isFinite(gramsEach)) {
      return (count * gramsEach) / 31.1035;
    }
  }

  const fracMatch = text.match(/(\d+)\s*\/\s*(\d+)\s*oz/);
  if (fracMatch) {
    const num = Number(fracMatch[1]);
    const den = Number(fracMatch[2]);
    if (Number.isFinite(num) && Number.isFinite(den) && den !== 0) {
      return num / den;
    }
  }

  const ozMatch = text.match(/(\d+(?:\.\d+)?)\s*oz/);
  if (ozMatch) {
    const oz = Number(ozMatch[1]);
    if (Number.isFinite(oz)) {
      return oz;
    }
  }

  const kgMatch = text.match(/(\d+(?:\.\d+)?)\s*kg/);
  if (kgMatch) {
    const kg = Number(kgMatch[1]);
    if (Number.isFinite(kg)) {
      return (kg * 1000) / 31.1035;
    }
  }

  const gMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:gram|g)\b/);
  if (gMatch) {
    const grams = Number(gMatch[1]);
    if (Number.isFinite(grams)) {
      return grams / 31.1035;
    }
  }

  return null;
};

const detectForm = (name) => {
  const lowered = name.toLowerCase();
  if (/(coin|proof|round|sovereign|kangaroo|kookaburra|koala|eagle|maple|britannia|philharmonic|krugerrand|panda)/i.test(name)) {
    return "Coin";
  }
  if (/(bar|cast|minted|ingot|poured|tablet|combi)/i.test(name)) {
    return "Bar";
  }
  return "Other";
};

const isBarOrCoin = (name) => {
  const lowered = name.toLowerCase();
  if (lowered.includes("pool allocated")) {
    return false;
  }
  return detectForm(name) !== "Other";
};

const extractSeriesKey = (name) => {
  const lowered = name.toLowerCase();
  const series = [
    "kangaroo",
    "kookaburra",
    "koala",
    "maple",
    "britannia",
    "eagle",
    "philharmonic",
    "krugerrand",
    "panda",
    "libertad",
    "swan",
    "dragon",
    "lunar",
  ];
  for (const key of series) {
    if (lowered.includes(key)) {
      return key;
    }
  }
  if (lowered.includes("cast")) return "cast";
  if (lowered.includes("minted")) return "minted";
  if (lowered.includes("poured")) return "poured";
  return null;
};

const extractProductsFromJsonLd = (html) => {
  const items = [];
  const regex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match = null;
  while ((match = regex.exec(html)) !== null) {
    const raw = match[1];
    try {
      const parsed = JSON.parse(raw);
      const queue = Array.isArray(parsed) ? parsed : [parsed];
      for (const entry of queue) {
        const graph = entry?.["@graph"];
        const nodes = graph ? graph : [entry];
        for (const node of nodes) {
          if (!node) continue;
          if (node["@type"] === "Product" || (Array.isArray(node["@type"]) && node["@type"].includes("Product"))) {
            items.push(node);
          }
        }
      }
    } catch (error) {
      // ignore malformed JSON-LD blocks
    }
  }
  return items;
};

const extractProductsFromHtml = (html) => {
  const sanitized = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ");
  const headingRegex = /<h[23][^>]*>[\s\S]*?<\/h[23]>/gi;
  const headings = [];
  let match = null;

  while ((match = headingRegex.exec(sanitized)) !== null) {
    const raw = match[0];
    const inner = raw.replace(/<\/?h[23][^>]*>/gi, "");
    const name = normalizeWhitespace(decodeHtmlEntities(stripTags(inner)));
    if (!name) {
      continue;
    }
    const hrefMatch = raw.match(/href="([^"]+)"/i);
    const href = hrefMatch ? hrefMatch[1] : null;
    headings.push({
      name,
      href,
      start: match.index + raw.length,
    });
  }

  const items = [];
  for (let i = 0; i < headings.length; i += 1) {
    const current = headings[i];
    const nextStart = i + 1 < headings.length ? headings[i + 1].start : sanitized.length;
    const block = sanitized.slice(current.start, nextStart);
    const priceMatch = block.match(/\$\s*([0-9,]+(?:\.\d+)?)/);
    if (!priceMatch) {
      continue;
    }

    const price = Number(priceMatch[1].replace(/,/g, ""));
    if (!Number.isFinite(price)) {
      continue;
    }

    if (!isBarOrCoin(current.name)) {
      continue;
    }

    const metal = parseMetalFromName(current.name);
    if (!metal) {
      continue;
    }

    const weightOz = parseWeightOz(current.name);
    if (!weightOz) {
      continue;
    }

    const url = current.href ? current.href : null;

    items.push({
      productName: current.name,
      metal,
      weightOz,
      priceAud: price,
      url,
    });
  }

  return items;
};

const toAbsoluteUrl = (baseUrl, href) => {
  if (!href) return baseUrl;
  if (href.startsWith("http")) return href;
  if (href.startsWith("/")) return `${baseUrl}${href}`;
  return `${baseUrl}/${href}`;
};

const normalizeProduct = (product, baseUrl) => {
  const name = normalizeWhitespace(decodeHtmlEntities(product.productName || ""));
  if (!name) return null;
  if (!isBarOrCoin(name)) return null;
  const metal = parseMetalFromName(name);
  if (!metal) return null;
  const weightOz = parseWeightOz(name);
  if (!weightOz) return null;
  const form = detectForm(name);
  const seriesKey = extractSeriesKey(name);
  const priceAud = Number(product.priceAud);
  if (!Number.isFinite(priceAud)) return null;
  return {
    productName: name,
    metal,
    weightOz,
    priceAud,
    url: toAbsoluteUrl(baseUrl, product.url),
    form,
    seriesKey,
  };
};

const extractProducts = (html, baseUrl) => {
  const items = [];

  for (const product of extractProductsFromHtml(html)) {
    const normalized = normalizeProduct(product, baseUrl);
    if (normalized) items.push(normalized);
  }

  const jsonLdItems = extractProductsFromJsonLd(html);
  for (const entry of jsonLdItems) {
    const name = entry?.name;
    const offers = entry?.offers;
    const offer = Array.isArray(offers) ? offers[0] : offers;
    const price = offer?.price ?? offer?.priceSpecification?.price;
    const url = entry?.url;
    const normalized = normalizeProduct(
      {
        productName: name,
        priceAud: price,
        url,
      },
      baseUrl
    );
    if (normalized) items.push(normalized);
  }

  const deduped = new Map();
  for (const item of items) {
    const key = `${item.productName}|${item.priceAud}|${item.url}`;
    if (!deduped.has(key)) {
      deduped.set(key, item);
    }
  }
  return Array.from(deduped.values());
};

const buildComparisonKey = (item) => {
  const weightKey = item.weightOz.toFixed(3);
  const seriesKey = item.seriesKey ? item.seriesKey : "generic";
  return `${item.metal}|${weightKey}|${item.form}|${seriesKey}`;
};

const formatWeightLabel = (weightOz) => {
  if (weightOz >= 1) {
    return `${Number(weightOz.toFixed(3))} oz`;
  }
  return `${Number(weightOz.toFixed(4))} oz`;
};

const formatSeriesLabel = (seriesKey, form) => {
  if (!seriesKey || seriesKey === "generic") {
    return form;
  }
  return seriesKey
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const mergeSellerComparisons = (items) => {
  const grouped = new Map();
  for (const item of items) {
    const key = buildComparisonKey(item);
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key).push(item);
  }

  const comparisons = [];
  for (const entries of grouped.values()) {
    const first = entries[0];
    const seriesLabel = formatSeriesLabel(first.seriesKey, first.form);
    const productName = `${formatWeightLabel(first.weightOz)} ${first.metal} ${seriesLabel}`;
    const offers = entries.map((entry) => ({
      sellerName: entry.sellerName,
      price: entry.priceAud,
      url: entry.url,
    }));
    comparisons.push({
      productName,
      metal: first.metal,
      weightOz: first.weightOz,
      offers,
    });
  }
  return comparisons;
};

const fetchSellerComparisons = async (seller) => {
  const responses = await Promise.allSettled(
    seller.urls.map(async (url) => {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0",
          Accept: "text/html",
        },
      });
      if (!response.ok) {
        throw new Error(`${seller.name} request failed (${response.status})`);
      }
      return { url, html: await response.text() };
    })
  );

  const successful = responses
    .filter((result) => result.status === "fulfilled")
    .map((result) => result.value);

  if (successful.length === 0) {
    return [];
  }

  const items = [];
  for (const entry of successful) {
    const extracted = extractProducts(entry.html, seller.baseUrl);
    for (const item of extracted) {
      items.push({
        ...item,
        sellerName: seller.name,
      });
    }
  }

  const deduped = new Map();
  for (const item of items) {
    const key = `${item.productName}|${item.priceAud}|${item.url}`;
    if (!deduped.has(key)) {
      deduped.set(key, item);
    }
  }
  return Array.from(deduped.values()).map((item) => ({
    productName: item.productName,
    metal: item.metal,
    weightOz: item.weightOz,
    offers: [
      {
        sellerName: item.sellerName,
        price: item.priceAud,
        url: item.url,
      },
    ],
    form: item.form,
    seriesKey: item.seriesKey,
    sellerName: item.sellerName,
  }));
};

const fetchAllSellerComparisons = async () => {
  const now = Date.now();
  if (cachedComparisons && now - comparisonsFetchedAt < CACHE_POLICY.comparisonsMs) {
    return cachedComparisons;
  }

  const sellerResults = await Promise.allSettled(
    SELLERS.map(async (seller) => fetchSellerComparisons(seller))
  );

  const allOffers = [];
  for (const result of sellerResults) {
    if (result.status === "fulfilled") {
      for (const comparison of result.value) {
        allOffers.push(comparison);
      }
    }
  }

  const normalized = [];
  for (const entry of allOffers) {
    normalized.push({
      productName: entry.productName,
      metal: entry.metal,
      weightOz: entry.weightOz,
      priceAud: entry.offers[0].price,
      url: entry.offers[0].url,
      sellerName: entry.offers[0].sellerName,
      form: entry.form ?? detectForm(entry.productName),
      seriesKey: entry.seriesKey ?? extractSeriesKey(entry.productName),
    });
  }

  cachedComparisons = mergeSellerComparisons(normalized);
  comparisonsFetchedAt = now;
  return cachedComparisons;
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", "http://localhost");

    if (req.method === "OPTIONS") {
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/health") {
      sendJson(res, 200, { status: "ok", service: "bulliontracker-api" });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/prices") {
      const prices = await fetchSpotRates();
      sendJson(res, 200, prices);
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/fx") {
      const fx = await fetchFxSnapshot();
      sendJson(res, 200, fx);
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/comparisons") {
      const comparisons = await fetchAllSellerComparisons();
      sendJson(res, 200, comparisons);
      return;
    }

    sendJson(res, 404, { error: "Not Found" });
  } catch (error) {
    console.error("API error:", error);
    sendJson(res, 500, {
      error: "Failed to fetch Yahoo Finance spot rates",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

const port = Number(process.env.PORT || 8787);
server.listen(port, () => {
  console.log(`BullionTracker API running on http://localhost:${port}`);
});
