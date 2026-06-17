import { LISTINGS, CITIES, NEIGHBORHOOD_INFO } from "./data.js";
import { analyze } from "./analytics.js";

// Analyze once at module load; reused everywhere.
const { listings: ALL, hoodStats } = analyze(LISTINGS);

export { ALL, hoodStats, CITIES, NEIGHBORHOOD_INFO };
