import type { SpotKnowledge } from "./types";

export const SAGE_SPOT_KNOWLEDGE: SpotKnowledge[] = [
  {
    id: "tamarack",
    name: "Tamarack",
    aliases: ["tamarack", "tamarack beach", "tamarack ave"],
    region: "North San Diego",
    breakType: "Beach / reef mix",
    howItBreaks:
      "A Carlsbad beach break with occasional reef influence. Peaks shift with sandbars — generally mellow shoulders with occasional punch on the sets. Works on a range of tides but favors a pushing mid tide when bars are defined.",
    bestSwellDirection:
      "South to SSW (180°–210°) through west and WNW (270°–310°). Summer SSW groundswell is a good angle here — not a miss — and winter W–NW also lights the bars.",
    cleanWindDirection:
      "Light east to northeast offshore (E–ENE) keeps faces smooth. Strong onshore W wind adds chop quickly.",
    tideNotes: "Mid tide when sandbars line up; too high can mush, too low exposes shallow inside sections.",
    localTips:
      "Look for the peak with the most consistent push. Less crowded than nearby Oceanside on many days.",
  },
  {
    id: "oceanside-pier",
    name: "Oceanside Pier",
    aliases: ["oceanside pier", "oceanside", "oside pier", "pier oceanside"],
    region: "North San Diego",
    breakType: "Beach break (pier peaks)",
    howItBreaks:
      "Sand-bottom peaks on both sides of the pier. North side often has longer walls; south side can offer punchier peaks. Shape depends heavily on sand movement and swell angle.",
    bestSwellDirection:
      "West to northwest (260°–310°). Longer-period W swells produce the best shape and push.",
    cleanWindDirection:
      "East offshore is ideal. Light NE also works. Afternoon sea breeze (W) deteriorates conditions fast.",
    tideNotes: "Low to mid tide often exposes better shape; high tide can fatten waves.",
    localTips:
      "Avoid surfing too close to the pier. North side typically handles more size than you'd expect from a beach break.",
  },
  {
    id: "the-rock",
    name: "The Rock",
    aliases: ["the rock", "rock oceanside", "oceanside rock"],
    region: "North San Diego",
    breakType: "Beach break (rock-influenced)",
    howItBreaks:
      "An exposed Oceanside beach break — not a reef. Peaks break over sand like neighboring beaches, but a visible rock nearshore helps shape and wedge sections on the right swell. More defined than a completely open beach when the rock is working; still sandbar-dependent.",
    bestSwellDirection:
      "South-southwest to west (200°–280°). Enough swell to stand up on the sandbars and catch the rock’s influence.",
    cleanWindDirection:
      "East to northeast offshore. Cross-shore N wind can be workable; onshore W is messy.",
    tideNotes:
      "Mid to low tide is when the exposed rock helps shape the waves. High tide softens the peak and can bury the rock’s effect.",
    localTips:
      "Treat it as a beach break for hazards and crowding. Respect the rock on lower tides — it shapes the wave but is also an obstacle. Scout peaks from the sand before paddling out.",
  },
  {
    id: "oceanside-harbor",
    name: "Oceanside Harbor",
    aliases: ["oceanside harbor", "oside harbor", "harbor oceanside"],
    region: "North San Diego",
    breakType: "Jetty / harbor sandbar",
    howItBreaks:
      "Breaks near the harbor jetties with sandbar peaks that can wedge and stand up. Often a fun, accessible option when open beaches are walled out.",
    bestSwellDirection:
      "South, southwest, and west (165°–280°). S, SW, and W all work here; northwest is the miss.",
    cleanWindDirection:
      "Light east or northeast offshore. Strong west onshore kills it; under 5 mph onshore is still rideable.",
    tideNotes: "Varies with sand; mid tide is a reliable starting point.",
    localTips:
      "Mind boat traffic and jetty rocks. The sandbar shifts — scout from the beach before paddling out.",
  },
  {
    id: "terramar",
    name: "Terramar",
    aliases: ["terramar", "terramar point", "terramar carlsbad"],
    region: "North San Diego",
    breakType: "Reef",
    howItBreaks:
      "A Carlsbad reef that can offer lined-up rights and lefts depending on sand and swell. Generally more performance-oriented than open beach breaks nearby.",
    bestSwellDirection:
      "West to northwest (270°–310°). Longer period helps the reef stand up cleanly.",
    cleanWindDirection:
      "East offshore is best. Light NE is workable.",
    tideNotes: "Mid to high tide often safer and more forgiving over the reef.",
    localTips:
      "Respect the locals and reef. Watch the inside on lower tides.",
  },
  {
    id: "ponto-jetty",
    name: "Ponto Jetty",
    aliases: ["ponto", "ponto jetty", "south ponto", "carlsbad ponto"],
    region: "North San Diego",
    breakType: "Jetty sandbar",
    howItBreaks:
      "South side of the Ponto jetty produces sandbar peaks that can wedge and peel. A popular go-to when swell is moderate and sand is good.",
    bestSwellDirection:
      "West to northwest (260°–310°). Needs enough push to wrap into the jetty sandbar.",
    cleanWindDirection:
      "East to northeast offshore. Onshore afternoon breeze is common in summer.",
    tideNotes: "Low to mid tide often best for shape; too high can soften the peak.",
    localTips:
      "Park and check the south side from the jetty before paddling. Crowds pick up on weekends.",
  },
  {
    id: "cardiff-reef",
    name: "Cardiff Reef",
    aliases: ["cardiff reef", "cardiff", "cardiff state beach reef"],
    region: "North San Diego",
    breakType: "Reef point",
    howItBreaks:
      "Classic Cardiff reef — long, workable walls that can connect through multiple sections on the right swell. One of the more reliable reef breaks in North County when W swells arrive.",
    bestSwellDirection:
      "Southwest to west (220°–280°). Winter W-NW swells are prime; SW can light up certain peaks.",
    cleanWindDirection:
      "East offshore is gold. Light NE also cleans it up.",
    tideNotes: "Mid tide is classic. Low tide gets fast and shallow on the inside.",
    localTips:
      "Position for the peak that links — don't sit too deep early. Can get crowded on good swells.",
  },
  {
    id: "seaside-reef",
    name: "Seaside Reef",
    aliases: ["seaside reef", "seaside", "seaside encinitas"],
    region: "North San Diego",
    breakType: "Reef",
    howItBreaks:
      "A reef break north of Cardiff that offers punchy peaks and occasional barrels when sand and swell align. More tide-sensitive than open beach breaks.",
    bestSwellDirection:
      "Southwest to west (220°–280°). Best with period 12s+.",
    cleanWindDirection:
      "East offshore. Cross winds from the N can add texture.",
    tideNotes: "Mid tide usually best. Low tide exposes reef and speeds up sections.",
    localTips:
      "Scout from the bluff. Entry can be tricky — know your exit before committing.",
  },
  {
    id: "del-mar",
    name: "Del Mar",
    aliases: ["del mar", "del mar beach", "del mar rivermouth"],
    region: "North San Diego",
    breakType: "Beach / rivermouth",
    howItBreaks:
      "Open beach peaks near the rivermouth that shift with sand. Can offer fun, rippable walls when bars are good. Rivermouth influence can create wedging peaks after rain events (water quality caution).",
    bestSwellDirection:
      "West to northwest (260°–310°).",
    cleanWindDirection:
      "East offshore. Afternoon W sea breeze is common.",
    tideNotes: "Mid tide is a safe bet; sandbars change seasonally.",
    localTips:
      "Check multiple peaks along the beach — the best bar moves.",
  },
  {
    id: "blacks-beach",
    name: "Black's Beach",
    aliases: ["blacks", "black's", "blacks beach", "black's beach", "torrey pines"],
    region: "San Diego",
    breakType: "Beach break (powerful sandbar)",
    howItBreaks:
      "A powerful, often hollow beach break beneath the cliffs. Can handle size and produces serious speed and barrels when sandbars are dialed. One of the heavier beach breaks in San Diego.",
    bestSwellDirection:
      "South to SSW (180°–210°) through west and NW (270°–320°). The submarine canyon focuses summer S–SSW energy and classic winter W–NW groundswell — SSW is a good angle here, not a miss.",
    cleanWindDirection:
      "East offshore is essential for the best shape. Onshore W destroys it.",
    tideNotes: "Mid tide often ideal. Low tide can be fast and heavy; know your limits.",
    localTips:
      "The hike matters — plan entry/exit. Respect the power; it's not a beginner break on good days.",
  },
  {
    id: "windansea",
    name: "Windansea",
    aliases: ["windansea", "windan sea", "wind and sea", "windansea la jolla"],
    region: "San Diego",
    breakType: "Reef / slab",
    howItBreaks:
      "Iconic La Jolla reef with fast, often hollow lefts and rights over rock and kelp. A performance wave that rewards commitment and local knowledge.",
    bestSwellDirection:
      "SSW to WNW (200°–315°). SW wrap and W–NW groundswell both work; not WNW-only.",
    cleanWindDirection:
      "East offshore. Light NE works; strong W onshore adds chop in the lineup.",
    tideNotes: "Mid to high tide is often more forgiving. Low tide gets shallow and serious.",
    localTips:
      "Watch the reef and locals. The takeoff zone is competitive — be patient and respectful.",
  },
  {
    id: "trestles-lowers",
    name: "Lower Trestles",
    aliases: ["lowers", "lower trestles", "trestles lowers", "trestles", "san clemente lowers"],
    region: "Orange County",
    breakType: "Cobblestone point",
    howItBreaks:
      "World-class cobblestone point with long, rippable walls and multiple sections. A high-performance wave that links through the inside on good days. Crowded but predictable when a solid S swell fills in.",
    bestSwellDirection:
      "South to SW (170°–220°) is classic — summer S groundswell lights up the point. SW through WNW (220°–315°) also works on bigger winter swell.",
    cleanWindDirection:
      "Light east to northeast offshore. Too much E wind can make it bumpy; glassy mornings are best.",
    tideNotes: "Works on a wide tide range; mid tide is a reliable benchmark.",
    localTips:
      "Walk the trail, warm up before the point. Priority and positioning matter — don't snake the inside.",
  },
  {
    id: "trestles-uppers",
    name: "Uppers",
    aliases: ["uppers", "upper trestles", "trestles uppers"],
    region: "Orange County",
    breakType: "Cobblestone point",
    howItBreaks:
      "Faster and often more hollow than Lowers. Shorter, punchier sections with a more critical takeoff. Favors confident surfers who can handle speed and tight pockets.",
    bestSwellDirection:
      "South to SW (170°–220°) through WNW (285°–315°). Needs solid swell energy — S summer swells or WNW winter groundswell.",
    cleanWindDirection:
      "Light east offshore. Glassy early mornings are prime.",
    tideNotes: "Mid tide is common; lower tide can get faster and shallower.",
    localTips:
      "Don't confuse it with Lowers — scout from the trail. The takeoff is less forgiving.",
  },
  {
    id: "trestles-middles",
    name: "Middles",
    aliases: ["middles", "middle trestles", "trestles middles"],
    region: "Orange County",
    breakType: "Cobblestone / sand mix",
    howItBreaks:
      "Mellower than Lowers and Uppers — fun, rippable walls that are more forgiving. A good option when other Trestles peaks are maxed out or too competitive.",
    bestSwellDirection:
      "South to SW (170°–220°) through WNW (270°–315°). Sand-influenced section of the Trestles stretch.",
    cleanWindDirection:
      "Light east offshore.",
    tideNotes: "Flexible; mid tide is a good default.",
    localTips:
      "Great for linking turns and building confidence before stepping to Lowers.",
  },
  {
    id: "grandview",
    name: "Grandview",
    aliases: ["grandview", "grandview encinitas", "grand view", "pipes", "pipe", "san elijo"],
    region: "North San Diego",
    breakType: "Reef / rock mix",
    howItBreaks:
      "San Elijo / Pipes / Grandview — mixed reef, rock, and beach peaks. Punchy reef sections when swell is clean; long rights when sand sits right. Less intense than Swami's on many days.",
    bestSwellDirection:
      "WNW to WNW (280°–305°). Clean west-northwest groundswell lights up the reef peaks.",
    cleanWindDirection:
      "East offshore. Light NE is workable.",
    tideNotes: "Mid to high tide over reef; low exposes rock and speeds up sections.",
    localTips:
      "Check from the overlook. Less intense than Swamis on many days but still reef-aware surfing.",
  },
  {
    id: "beacons",
    name: "Beacons",
    aliases: ["beacons", "beacons beach", "beacons encinitas"],
    region: "North San Diego",
    breakType: "Reef / beach",
    howItBreaks:
      "A Leucadia/Encinitas break that can offer fun peaks with reef influence. Works on a variety of swells but shines on clean SW-W energy.",
    bestSwellDirection:
      "Southwest to west (220°–280°).",
    cleanWindDirection:
      "East offshore.",
    tideNotes: "Mid tide is a reliable starting point.",
    localTips:
      "Scout the peak from the cliff path. Parking can be tight on good days.",
  },
  {
    id: "d-street",
    name: "D Street",
    aliases: ["d street", "d-street", "d st encinitas"],
    region: "North San Diego",
    breakType: "Beach break",
    howItBreaks:
      "A popular Encinitas beach break with sand peaks that can offer fun, rippable walls. Shape depends on sandbars and swell period.",
    bestSwellDirection:
      "West to northwest (260°–310°).",
    cleanWindDirection:
      "East offshore. Afternoon onshore is common in summer.",
    tideNotes: "Low to mid tide often best for shape.",
    localTips:
      "Crowded on weekends — early mornings win. Multiple peaks along the beach.",
  },
  {
    id: "del-mar-jetty",
    name: "Del Mar Jetty",
    aliases: ["del mar jetty", "dm jetty"],
    region: "North San Diego",
    breakType: "Jetty peak",
    howItBreaks:
      "Jetty-influenced peaks that can wedge and stand up with punch. A go-to when sand is stacked and swell has angle.",
    bestSwellDirection:
      "West to northwest (260°–310°).",
    cleanWindDirection:
      "East offshore.",
    tideNotes: "Mid tide often best; jetty influence changes with sand movement.",
    localTips:
      "Mind the jetty rocks and currents. The peak shifts — watch a set cycle before paddling out.",
  },
  {
    id: "ocean-beach",
    name: "Ocean Beach",
    aliases: ["ocean beach", "ob", "ocean beach sd", "ob pier"],
    region: "San Diego",
    breakType: "Beach break",
    howItBreaks:
      "Open San Diego beach break with multiple peaks along the strand. Can be fun and rippable or closed out depending on sand and swell. The pier and jetties influence nearby peaks.",
    bestSwellDirection:
      "West to northwest (260°–310°).",
    cleanWindDirection:
      "East offshore in the morning. Afternoon W onshore is very common.",
    tideNotes: "Mid tide is a safe default; sandbars shift frequently.",
    localTips:
      "Check south of the pier vs north — conditions can differ. Dog beach area has its own vibe and peaks.",
  },
  {
    id: "swamis",
    name: "Swami's",
    aliases: ["swamis", "swami's", "swamis encinitas"],
    region: "North San Diego",
    breakType: "Reef point",
    howItBreaks:
      "Classic Encinitas reef point with long, workable walls that can connect through multiple sections. One of North County's most iconic rights (and occasional lefts).",
    bestSwellDirection:
      "WNW to NW (285°–315°). Long-period W-NW swells are prime.",
    cleanWindDirection:
      "East offshore is ideal.",
    tideNotes: "Mid tide is classic. Low tide gets fast; high tide can soften.",
    localTips:
      "The point rewards patience and positioning. Crowded on good swells — respect priority.",
  },
  {
    id: "scripps-pier",
    name: "Scripps Pier",
    aliases: ["scripps", "scripps pier", "la jolla scripps", "scripps la jolla"],
    region: "San Diego",
    breakType: "Beach / reef mix",
    howItBreaks:
      "Breaks near the Scripps pier with reef and sand influence. Can offer fun peaks for a range of abilities when swell is moderate.",
    bestSwellDirection:
      "West to northwest (260°–310°).",
    cleanWindDirection:
      "East offshore. Morning glass is best before onshore fills in.",
    tideNotes: "Mid tide is a reliable bet.",
    localTips:
      "Stay clear of the pier. UCSD crowd and locals — be respectful in the lineup.",
  },
  {
    id: "pacific-beach",
    name: "Pacific Beach",
    aliases: ["pacific beach", "pb", "pb pier", "pacific beach pier"],
    region: "San Diego",
    breakType: "Beach break",
    howItBreaks:
      "Open beach peaks along PB — generally mellow to medium power depending on swell. Pier and jetty areas can wedge on the right sand.",
    bestSwellDirection:
      "West to northwest (260°–310°).",
    cleanWindDirection:
      "East morning offshore; expect afternoon W onshore in summer.",
    tideNotes: "Mid tide for most peaks.",
    localTips:
      "Tourmaline to the north is mellower; pier area gets more punch. Very crowded on weekends.",
  },
  {
    id: "mission-jetty",
    name: "Mission Jetty",
    aliases: ["mission jetty", "mission beach jetty", "mission bay jetty", "south jetty mission"],
    region: "San Diego",
    breakType: "Jetty sandbar",
    howItBreaks:
      "Jetty sandbars that can produce wedging, fun peaks when sand is stacked. A popular city break that works on typical W swells.",
    bestSwellDirection:
      "West to northwest (260°–310°).",
    cleanWindDirection:
      "East offshore. Onshore W common in the afternoon.",
    tideNotes: "Mid to low tide often best for jetty wedges.",
    localTips:
      "Mind the jetty rocks and crowds. South side vs north side can differ — check both.",
  },
];

const CATALOG_TO_KNOWLEDGE_ID: Record<string, string> = {
  trestles: "trestles-lowers",
  oceanside: "oceanside-pier",
  cardiff: "cardiff-reef",
};

export function findSpotKnowledgeByCatalogId(
  catalogId: string
): SpotKnowledge | undefined {
  const id = CATALOG_TO_KNOWLEDGE_ID[catalogId] ?? catalogId;
  return SAGE_SPOT_KNOWLEDGE.find((spot) => spot.id === id);
}

export function findSpotKnowledge(query: string): SpotKnowledge | undefined {
  const lower = query
    .toLowerCase()
    .replace(/[\u2018\u2019\u02BC\u2032`]/g, "'");
  const ranked = [...SAGE_SPOT_KNOWLEDGE].sort(
    (a, b) => b.name.length - a.name.length
  );
  for (const spot of ranked) {
    const name = spot.name.toLowerCase().replace(/[\u2018\u2019\u02BC\u2032`]/g, "'");
    if (lower.includes(name)) return spot;
    if (
      spot.aliases.some((alias) =>
        lower.includes(alias.toLowerCase().replace(/[\u2018\u2019\u02BC\u2032`]/g, "'"))
      )
    ) {
      return spot;
    }
  }
  return undefined;
}

export function formatSpotKnowledge(spot: SpotKnowledge): string {
  return `SPOT: ${spot.name} (${spot.region}) — ${spot.breakType}
How it breaks: ${spot.howItBreaks}
Best swell direction: ${spot.bestSwellDirection}
Clean wind: ${spot.cleanWindDirection}
Tide: ${spot.tideNotes}
Local tips: ${spot.localTips}`;
}
