/* ------------------------------------------------------------------
 * MarketLens — sample listings dataset (multi-city)
 *
 * In a real deployment this would come from an MLS feed / scraper / API.
 * Here we generate a deterministic, realistic set of listings across
 * several metros so the demo is reproducible (seeded PRNG — no Math.random).
 * ------------------------------------------------------------------ */

// Each city has a map center, default zoom, and a set of neighborhoods.
// Every neighborhood has an approximate center and a "true" market price/sqft.
const CITIES = [
  {
    name: "San Francisco",
    center: [37.765, -122.44],
    zoom: 13,
    neighborhoods: [
      { name: "Mission",         lat: 37.7599, lng: -122.4148, basePsf: 1050 },
      { name: "Noe Valley",      lat: 37.7502, lng: -122.4337, basePsf: 1250 },
      { name: "SoMa",            lat: 37.7785, lng: -122.4056, basePsf:  980 },
      { name: "Marina",          lat: 37.8030, lng: -122.4360, basePsf: 1400 },
      { name: "Sunset",          lat: 37.7510, lng: -122.4940, basePsf:  900 },
      { name: "Pacific Heights", lat: 37.7925, lng: -122.4382, basePsf: 1600 },
    ],
    streets: ["Valencia", "Folsom", "Castro", "Dolores", "Fillmore", "Divisadero", "Noe", "Hayes"],
  },
  {
    name: "New York",
    center: [40.735, -73.99],
    zoom: 12,
    neighborhoods: [
      { name: "Williamsburg",  lat: 40.7142, lng: -73.9540, basePsf: 1300 },
      { name: "Upper East Side", lat: 40.7736, lng: -73.9566, basePsf: 1500 },
      { name: "Chelsea",       lat: 40.7465, lng: -74.0014, basePsf: 1800 },
      { name: "Harlem",        lat: 40.8116, lng: -73.9465, basePsf:  850 },
      { name: "West Village",  lat: 40.7358, lng: -74.0036, basePsf: 2100 },
    ],
    streets: ["Bedford", "Lexington", "Madison", "Bleecker", "Hudson", "Bowery", "Mercer", "Spring"],
  },
  {
    name: "Austin",
    center: [30.27, -97.74],
    zoom: 12,
    neighborhoods: [
      { name: "Downtown",      lat: 30.2672, lng: -97.7431, basePsf:  700 },
      { name: "East Austin",   lat: 30.2640, lng: -97.7180, basePsf:  520 },
      { name: "South Congress", lat: 30.2480, lng: -97.7510, basePsf:  600 },
      { name: "Hyde Park",     lat: 30.3050, lng: -97.7280, basePsf:  480 },
      { name: "Zilker",        lat: 30.2640, lng: -97.7700, basePsf:  650 },
    ],
    streets: ["Congress", "Lamar", "Guadalupe", "Cesar Chavez", "Manor", "Burnet", "Barton", "Riverside"],
  },
  {
    name: "Seattle",
    center: [47.62, -122.33],
    zoom: 12,
    neighborhoods: [
      { name: "Capitol Hill",  lat: 47.6230, lng: -122.3120, basePsf:  720 },
      { name: "Ballard",       lat: 47.6680, lng: -122.3840, basePsf:  640 },
      { name: "Queen Anne",    lat: 47.6370, lng: -122.3570, basePsf:  780 },
      { name: "Fremont",       lat: 47.6510, lng: -122.3500, basePsf:  680 },
      { name: "West Seattle",  lat: 47.5700, lng: -122.3870, basePsf:  560 },
    ],
    streets: ["Pike", "Pine", "Market", "Denny", "Mercer", "Leary", "Fremont", "California"],
  },
  {
    name: "Miami",
    center: [25.78, -80.21],
    zoom: 12,
    neighborhoods: [
      { name: "Brickell",      lat: 25.7617, lng: -80.1918, basePsf:  680 },
      { name: "Wynwood",       lat: 25.8010, lng: -80.1990, basePsf:  560 },
      { name: "Coconut Grove", lat: 25.7280, lng: -80.2430, basePsf:  640 },
      { name: "South Beach",   lat: 25.7820, lng: -80.1300, basePsf:  820 },
      { name: "Coral Gables",  lat: 25.7210, lng: -80.2680, basePsf:  590 },
    ],
    streets: ["Biscayne", "Brickell", "Collins", "Ocean", "Coral", "Grand", "Flagler", "Bird"],
  },
];

// Tiny seeded PRNG (mulberry32) — keeps the dataset stable across reloads.
function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PROPERTY_TYPES = ["Condo", "Single Family", "Townhouse", "Multi-Family"];

// Reliable house photos (Unsplash CDN). A small set is cycled across listings
// so the browser caches them — fast and no "No photo" fallbacks. Swap for real
// per-listing photo URLs when wiring a live data feed.
const HOUSE_PHOTOS = [
  "1568605114967-8130f3a36994",
  "1570129477492-45c003edd2be",
  "1600585154340-be6161a56a0c",
  "1580587771525-78b9dba3b914",
  "1572120360610-d971b9d7767c",
  "1600596542815-ffad4c1539a9",
  "1605276374104-dee2a0ed3cd6",
  "1564013799919-ab600027ffc6",
  "1512917774080-9991f1c4c750",
  "1583608205776-bfd35f0d9f83",
].map((id) => `https://images.unsplash.com/photo-${id}?w=600&fit=crop&q=70`);

function round(n, step) { return Math.round(n / step) * step; }

// Stable string hash so each neighborhood always gets the same scores.
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Neighborhood-level "fit" data — what photos can't tell a buyer.
const AMENITIES = ["Cafés", "Parks", "Nightlife", "Grocery", "Schools",
  "Transit", "Restaurants", "Gyms", "Waterfront", "Bike lanes"];
const NEIGHBORHOOD_INFO = {};
for (const c of CITIES) {
  for (const h of c.neighborhoods) {
    const r = makeRng(hashStr(h.name));
    const amenities = AMENITIES.filter(() => r() > 0.5);
    NEIGHBORHOOD_INFO[h.name] = {
      city: c.name,
      walk: 45 + Math.floor(r() * 56),      // 45–100 (higher better)
      transit: 35 + Math.floor(r() * 66),   // higher better
      school: 4 + Math.floor(r() * 7),      // 4–10 (higher better)
      safety: 45 + Math.floor(r() * 56),    // higher better
      noise: 20 + Math.floor(r() * 60),     // 20–80 (LOWER better)
      amenities: amenities.length ? amenities : ["Grocery", "Parks"],
      // Investment fundamentals (HouseCanary-style forecast + rent economics)
      appreciation: 1 + Math.floor(r() * 7),       // projected 12-mo % (1–7)
      rentYield: 0.04 + r() * 0.035,               // annual gross rent / price (4–7.5%)
    };
  }
}

function generateListings(perCity) {
  const rng = makeRng(20260615);
  const listings = [];
  let id = 0;

  for (const city of CITIES) {
    for (let i = 0; i < perCity; i++) {
      const hood = city.neighborhoods[Math.floor(rng() * city.neighborhoods.length)];

      const beds = 1 + Math.floor(rng() * 4);            // 1–4
      const baths = Math.max(1, beds - Math.floor(rng() * 2));
      const sqft = round(550 + beds * 350 + rng() * 600, 10);

      // Honest price = neighborhood psf * a quality multiplier.
      const quality = 0.9 + rng() * 0.25;                // 0.90–1.15
      const fairPsf = hood.basePsf * quality;

      // Inject deliberate mispricing so the engine has anomalies to surface.
      //   ~18% clear deals, ~18% overpriced, the rest fair.
      const roll = rng();
      let mispricing;
      if (roll < 0.18) mispricing = 0.72 + rng() * 0.10;       // undervalued
      else if (roll > 0.82) mispricing = 1.18 + rng() * 0.14;  // overpriced
      else mispricing = 0.96 + rng() * 0.08;                   // fair-ish

      const price = round(fairPsf * sqft * mispricing, 5000);

      // Scatter the marker around the neighborhood center.
      const lat = hood.lat + (rng() - 0.5) * 0.012;
      const lng = hood.lng + (rng() - 0.5) * 0.015;

      // --- objective facts (what photos can hide) ---
      const type = PROPERTY_TYPES[Math.floor(rng() * PROPERTY_TYPES.length)];
      const parking = rng() > 0.4;
      const OUTDOOR = ["Private yard", "Balcony", "Shared garden", "None"];
      const outdoor = OUTDOOR[Math.floor(rng() * OUTDOOR.length)];

      const conditionScore = 2 + Math.floor(rng() * 4); // 2–5
      const condition = { 5: "Excellent", 4: "Good", 3: "Fair", 2: "Needs work" }[conditionScore];
      const ISSUE_POOL = [
        "Roof nearing end of life", "Aging HVAC system", "Kitchen needs updating",
        "Minor foundation settling noted", "Dated bathrooms", "Some deferred maintenance",
      ];
      const issueCount =
        conditionScore >= 5 ? 0 : conditionScore === 4 ? (rng() > 0.6 ? 1 : 0) : conditionScore === 3 ? 1 : 2;
      const issues = [];
      while (issues.length < issueCount) {
        const it = ISSUE_POOL[Math.floor(rng() * ISSUE_POOL.length)];
        if (!issues.includes(it)) issues.push(it);
      }
      const hoa = type === "Condo" || type === "Townhouse" ? round(250 + rng() * 650, 10) : 0;

      id++;
      listings.push({
        id,
        // Reliable cached house photo, cycled across the set.
        photo: HOUSE_PHOTOS[(id - 1) % HOUSE_PHOTOS.length],
        address: `${100 + Math.floor(rng() * 900)} ${city.streets[Math.floor(rng() * city.streets.length)]} St`,
        city: city.name,
        neighborhood: hood.name,
        type,
        price,
        beds,
        baths,
        sqft,
        yearBuilt: 1900 + Math.floor(rng() * 124),
        daysOnMarket: Math.floor(rng() * 90),
        parking,
        outdoor,
        condition,
        conditionScore,
        issues,
        hoa,
        lat,
        lng,
      });
    }
  }

  return listings;
}

const LISTINGS = generateListings(60);   // 60 per city

export { CITIES, NEIGHBORHOOD_INFO, LISTINGS };
