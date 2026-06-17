export const fmtMoney = (n) => "$" + Math.round(n).toLocaleString("en-US");
export const fmtMoneyShort = (n) =>
  n >= 1e6 ? "$" + (n / 1e6).toFixed(2) + "M" : "$" + Math.round(n / 1e3) + "K";

export const CAT_KEY = { undervalued: "u", fair: "f", overpriced: "o" };
export const CAT_COLOR = { undervalued: "#10b981", fair: "#6b7689", overpriced: "#ef4444" };
