import { NEIGHBORHOOD_INFO } from "./data.js";

/* ------------------------------------------------------------------
 * MarketLens — valuation & anomaly analytics
 *
 * Core idea: every listing is scored against its OWN neighborhood's
 * price-per-square-foot distribution. A listing priced well below the
 * local norm is a "high-value opportunity"; well above is "overpriced".
 * We use a robust z-score (median + MAD) so a few extreme listings
 * don't distort the baseline.
 * ------------------------------------------------------------------ */

function median(nums) {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

// Median Absolute Deviation — a robust spread measure.
function mad(nums, med) {
  if (!nums.length) return 0;
  const devs = nums.map((n) => Math.abs(n - med));
  return median(devs);
}

// Thresholds for the robust z-score, in MAD units.
const DEAL_Z = -1.0;   // at/below: undervalued (opportunity)
const OVER_Z = 1.0;    // at/above: overpriced

function classify(z) {
  if (z <= DEAL_Z) return "undervalued";
  if (z >= OVER_Z) return "overpriced";
  return "fair";
}

/* ------------------------------------------------------------------
 * Investment layer — combines a HouseCanary-style valuation (AVM fair
 * value, confidence, appreciation forecast) with Privy-style investor
 * analytics (rent economics, strategy tag, ARV/flip profit, deal score).
 * All deterministic, derived from the listing + neighborhood data.
 * ------------------------------------------------------------------ */
const CONDITION_FACTOR = { 5: 1.08, 4: 1.0, 3: 0.9, 2: 0.8 };

function investmentMetrics(l, stat, info) {
  // --- HouseCanary-style AVM: a fair value independent of the list price ---
  const condFactor = CONDITION_FACTOR[l.conditionScore] || 1;
  const estValue = Math.round((stat.medianPsf * l.sqft * condFactor) / 1000) * 1000;
  const vsEstimatePct = (l.price / estValue - 1) * 100; // negative = listed below AVM
  const valConfidence = Math.min(95, 72 + Math.min(20, stat.count));
  const forecast = info ? info.appreciation : 3;

  // --- Rent economics ---
  const rentYield = info ? info.rentYield : 0.05;       // annual gross rent / price
  const annualGrossRent = l.price * rentYield;
  const rentEstimate = Math.round(annualGrossRent / 12);
  const noiAnnual = annualGrossRent * 0.62;             // ~38% operating expenses
  const capRate = noiAnnual / l.price;
  const grossYield = rentYield;

  // Financed cash flow: 25% down, 7% / 30yr on the balance.
  const loan = l.price * 0.75;
  const mr = 0.07 / 12;
  const pmt = (loan * mr) / (1 - Math.pow(1 + mr, -360));
  const cashFlow = Math.round(noiAnnual / 12 - pmt);

  // --- Privy-style flip / value-add economics ---
  const arv = Math.round((stat.medianPsf * 1.12 * l.sqft) / 1000) * 1000; // renovated to top of market
  const rehab = Math.round((5 - l.conditionScore) * l.sqft * 40);         // ~$40/sqft per condition grade
  const estProfit = Math.round(arv - l.price - rehab - arv * 0.08);       // less 8% selling costs

  // --- Strategy tag ---
  let strategy;
  if (l.conditionScore <= 2 && vsEstimatePct < -3 && estProfit > 0) strategy = "Fix & Flip";
  else if (l.conditionScore === 3 && vsEstimatePct < 0) strategy = "Value-add";
  else if (capRate >= 0.04) strategy = "Buy & Hold";
  else if (l.conditionScore >= 4) strategy = "Turnkey rental";
  else strategy = "Speculative";

  // --- Deal score (0–100): discount vs AVM + yield + upside ---
  let score = 0;
  score += Math.max(0, Math.min(45, -vsEstimatePct * 2.5));
  score += Math.max(0, Math.min(35, capRate * 700));
  if (strategy === "Fix & Flip" || strategy === "Value-add") {
    score += Math.max(0, Math.min(20, (estProfit / l.price) * 100));
  } else {
    score += cashFlow > 0 ? 15 : 0;
  }
  const dealScore = Math.round(Math.min(100, score));

  // --- Equity (instant equity vs AVM) ---
  const equity = estValue - l.price;
  const equityPct = (equity / estValue) * 100;

  // --- Investor activity score (Privy-style "where investors are buying") ---
  const activityScore = Math.round(
    Math.max(0, Math.min(100,
      dealScore * 0.6 + forecast * 3 + Math.max(0, 60 - l.daysOnMarket) * 0.3
    ))
  );

  return {
    estValue, vsEstimatePct, valConfidence, forecast,
    rentEstimate, capRate, grossYield, cashFlow,
    arv, rehab, estProfit, strategy, dealScore,
    equity, equityPct, activityScore,
  };
}

/**
 * Enrich every listing with valuation metrics and return both the
 * enriched listings and per-neighborhood summary stats.
 */
function analyze(listings) {
  // 1. price-per-sqft for each listing
  const enriched = listings.map((l) => ({
    ...l,
    psf: l.price / l.sqft,
  }));

  // 2. group by neighborhood and build the baseline distribution
  const byHood = {};
  for (const l of enriched) {
    (byHood[l.neighborhood] ||= []).push(l);
  }

  const hoodStats = {};
  for (const [name, group] of Object.entries(byHood)) {
    const psfs = group.map((g) => g.psf);
    const med = median(psfs);
    const spread = mad(psfs, med) || 1; // guard against zero spread
    hoodStats[name] = {
      name,
      count: group.length,
      medianPsf: med,
      madPsf: spread,
      medianPrice: median(group.map((g) => g.price)),
    };
  }

  // 3. score each listing against its neighborhood
  for (const l of enriched) {
    const stat = hoodStats[l.neighborhood];
    // 1.4826 scales MAD to be comparable to a std-dev for normal data.
    const z = (l.psf - stat.medianPsf) / (1.4826 * stat.madPsf);
    const deltaPct = (l.psf / stat.medianPsf - 1) * 100;

    l.robustZ = z;
    l.deltaPct = deltaPct;                  // how far above/below local median psf
    l.category = classify(z);
    // Opportunity score: bigger discount = higher. Stale listings get a small bump.
    l.opportunityScore =
      Math.max(0, -deltaPct) + Math.min(15, l.daysOnMarket / 6);

    // Investment layer (HouseCanary AVM + Privy investor analytics).
    const info = NEIGHBORHOOD_INFO[l.neighborhood] || null;
    Object.assign(l, investmentMetrics(l, stat, info));
  }

  return { listings: enriched, hoodStats };
}

/** Great-circle distance between two lat/lng points, in meters. */
function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Find the N most comparable listings to `target`: same city, similar beds,
 * ranked by a blend of size similarity and proximity. Used for the comps
 * section and the "why it's a deal" breakdown.
 */
function findComps(target, all, n = 4) {
  const candidates = all.filter(
    (l) =>
      l.id !== target.id &&
      l.city === target.city &&
      Math.abs(l.beds - target.beds) <= 1
  );

  const scored = candidates.map((l) => {
    const dist = distanceMeters(target.lat, target.lng, l.lat, l.lng);
    const sqftDiff = Math.abs(l.sqft - target.sqft) / target.sqft;
    // Lower is more comparable: distance (km) weighted with size difference.
    const score = dist / 1000 + sqftDiff * 5;
    return { ...l, _compScore: score };
  });

  scored.sort((a, b) => a._compScore - b._compScore);
  return scored.slice(0, n);
}

/* ------------------------------------------------------------------
 * Buyer match scoring — a PHOTO-INDEPENDENT 0–100 fit score.
 * This is the antidote to "too many irrelevant results" and to buyers
 * skipping good homes because of weak photos: it ranks on facts.
 * ------------------------------------------------------------------ */
function clamp01(x) { return Math.max(0, Math.min(1, x)); }

const MATCH_WEIGHTS = {
  budget: 0.25, beds: 0.15, parking: 0.1, outdoor: 0.1,
  walk: 0.12, school: 0.12, value: 0.16,
};

function matchScore(l, prefs, info) {
  const budgetFit = prefs.budget
    ? (l.price <= prefs.budget ? 1 : clamp01(1 - (l.price - prefs.budget) / prefs.budget))
    : 1;
  const bedsFit = prefs.minBeds ? (l.beds >= prefs.minBeds ? 1 : clamp01(l.beds / prefs.minBeds)) : 1;
  const parkingFit = prefs.parking ? (l.parking ? 1 : 0) : 1;
  const outdoorFit = prefs.outdoor ? (l.outdoor && l.outdoor !== "None" ? 1 : 0) : 1;

  const walk = info ? info.walk : 60;
  const walkFit = prefs.minWalk ? (walk >= prefs.minWalk ? 1 : clamp01(walk / prefs.minWalk)) : clamp01(walk / 100);
  const school = info ? info.school : 6;
  const schoolFit = prefs.minSchool ? (school >= prefs.minSchool ? 1 : clamp01(school / prefs.minSchool)) : clamp01(school / 10);

  const valueFit = l.category === "undervalued" ? 1 : l.category === "fair" ? 0.6 : 0.2;

  const w = MATCH_WEIGHTS;
  const s =
    budgetFit * w.budget + bedsFit * w.beds + parkingFit * w.parking +
    outdoorFit * w.outdoor + walkFit * w.walk + schoolFit * w.school + valueFit * w.value;
  return Math.round(s * 100);
}

/**
 * Where a listing's price sits within its neighborhood, as a percentile
 * (0 = cheapest, 100 = priciest). Answers the brief's "market positioning".
 */
function pricePercentile(listing, all) {
  const peers = all.filter((l) => l.neighborhood === listing.neighborhood);
  if (peers.length <= 1) return 50;
  const below = peers.filter((l) => l.price < listing.price).length;
  return Math.round((below / (peers.length - 1)) * 100);
}

/** Bucket numbers into a histogram of {label, count} for charting. */
function histogram(values, bucketCount, fmt) {
  if (!values.length) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const size = span / bucketCount;
  const buckets = Array.from({ length: bucketCount }, (_, i) => ({
    lo: min + i * size,
    hi: min + (i + 1) * size,
    count: 0,
  }));
  for (const v of values) {
    let idx = Math.floor((v - min) / size);
    if (idx >= bucketCount) idx = bucketCount - 1;
    buckets[idx].count++;
  }
  return buckets.map((b) => ({
    label: fmt ? fmt(b.lo) : `${Math.round(b.lo)}`,
    count: b.count,
  }));
}

/** Portfolio-level rollup for the insights panel. */
function summarize(listings) {
  const counts = { undervalued: 0, fair: 0, overpriced: 0 };
  for (const l of listings) counts[l.category]++;

  const opportunities = listings
    .filter((l) => l.category === "undervalued")
    .sort((a, b) => b.opportunityScore - a.opportunityScore);

  return {
    total: listings.length,
    counts,
    medianPrice: median(listings.map((l) => l.price)),
    medianPsf: median(listings.map((l) => l.psf)),
    opportunities,
  };
}
export { analyze, summarize, matchScore, findComps, pricePercentile, histogram, distanceMeters, investmentMetrics, median };
