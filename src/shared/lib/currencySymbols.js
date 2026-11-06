const CURRENCY_SYMBOLS = {
  USD: "$",
  PKR: "PKR ",
  EUR: "€",
  GBP: "£",
  AED: "AED ",
  SAR: "SAR ",
  INR: "₹",
  CAD: "CAD $",
  AUD: "AUD $",
  JPY: "¥",
  CNY: "¥",
  CHF: "CHF ",
  TRY: "₺",
  MYR: "RM ",
  SGD: "S$",
  NZD: "NZ$",
  QAR: "QAR ",
  KWD: "KD ",
  BHD: "BD ",
  OMR: "OMR "
};
const CODE_KEYS = [
  "currencyCode",
  "currency_code",
  "CurrencyCode",
  "currency",
  "Currency",
  "selectedCurrency",
  "restaurantCurrency",
  "currencyType",
  "defaultCurrency",
  "fiatCurrency",
  "moneyCurrency",
  "code",
  "iso",
  "isoCode"
];
const SYMBOL_KEYS = [
  "currencySymbol",
  "currency_symbol",
  "CurrencySymbol",
  "symbol",
  "sign",
  "token"
];
function symbolForCurrencyCode(code, fallback = "") {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return fallback;
  return CURRENCY_SYMBOLS[normalized] || `${normalized} `;
}
function asRecord(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }
  return null;
}
function text(value) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}
function looksLikeCurrencyCode(value) {
  const upper = value.toUpperCase();
  if (CURRENCY_SYMBOLS[upper]) return true;
  return /^[A-Z]{3}$/.test(upper);
}
function readFromRow(row) {
  const nestedCurrency = asRecord(row.currency) || asRecord(row.Currency) || asRecord(row.selectedCurrency) || asRecord(row.restaurantCurrency);
  const hasCurrencyHint = Boolean(nestedCurrency) || CODE_KEYS.some((key) => key.toLowerCase().includes("currency") && row[key] != null && row[key] !== "") || SYMBOL_KEYS.some((key) => row[key] != null && row[key] !== "");
  if (!hasCurrencyHint) return null;
  let code = "";
  let symbol = "";
  if (nestedCurrency) {
    code = text(nestedCurrency.code) || text(nestedCurrency.currencyCode) || text(nestedCurrency.iso) || text(nestedCurrency.isoCode) || "";
    symbol = text(nestedCurrency.symbol) || text(nestedCurrency.currencySymbol) || text(nestedCurrency.sign) || text(nestedCurrency.token) || "";
  }
  if (!code) {
    for (const key of CODE_KEYS) {
      if (!key.toLowerCase().includes("currency") && !nestedCurrency) continue;
      const value = text(row[key]);
      if (value && looksLikeCurrencyCode(value)) {
        code = value;
        break;
      }
    }
  }
  if (!code && typeof row.currency === "string" && looksLikeCurrencyCode(row.currency)) {
    code = row.currency.trim();
  }
  if (!symbol) {
    for (const key of SYMBOL_KEYS) {
      const value = text(row[key]);
      if (value) {
        symbol = value;
        break;
      }
    }
  }
  if (!code && !symbol) return null;
  const resolvedCode = (code || "USD").toUpperCase();
  let resolvedSymbol = symbol || symbolForCurrencyCode(resolvedCode, `${resolvedCode} `);
  if (/^[A-Z]{3}$/i.test(resolvedSymbol.trim()) && !resolvedSymbol.endsWith(" ")) {
    resolvedSymbol = `${resolvedSymbol.trim()} `;
  }
  const positionRaw = text(
    nestedCurrency?.position || row.currencyPosition || row.currency_position
  ).toLowerCase();
  const position = positionRaw === "suffix" ? "suffix" : "prefix";
  return { code: resolvedCode, symbol: resolvedSymbol, position };
}
function extractCurrencyFromProfile(payload) {
  if (!payload || typeof payload !== "object") return null;
  const queue = [payload];
  const seen = /* @__PURE__ */ new Set();
  while (queue.length) {
    const current = queue.shift();
    if (!current || typeof current !== "object" || seen.has(current)) continue;
    seen.add(current);
    if (Array.isArray(current)) {
      for (const item of current.slice(0, 40)) queue.push(item);
      continue;
    }
    const row = current;
    const found = readFromRow(row);
    if (found) return found;
    for (const value of Object.values(row)) {
      if (value && typeof value === "object") queue.push(value);
    }
  }
  return null;
}
export {
  CURRENCY_SYMBOLS,
  extractCurrencyFromProfile,
  symbolForCurrencyCode
};
