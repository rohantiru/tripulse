import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend, ComposedChart,
  ReferenceLine, ScatterChart, Scatter
} from "recharts";

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIG & CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════
const STRAVA_CLIENT_ID = "156140"; // ← Replace with your Strava app client ID
const STRAVA_CLIENT_SECRET = "5907bb2bd9ca75978e8c20e5bd0e09847b30f74e"; // ← Replace (or use backend proxy)
const REDIRECT_URI = window.location.origin + window.location.pathname;
const STRAVA_AUTH_URL = `https://www.strava.com/oauth/authorize?client_id=${STRAVA_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=activity:read_all,read`;

const SPORT = {
  swim: { color: "#00D4FF", dim: "rgba(0,212,255,0.15)", icon: "🏊", label: "Swim", types: ["Swim"] },
  bike: { color: "#FF8C00", dim: "rgba(255,140,0,0.15)", icon: "🚴", label: "Bike", types: ["Ride", "VirtualRide", "MountainBikeRide", "GravelRide", "EBikeRide", "EMountainBikeRide", "Handcycle", "Velomobile"] },
  run:  { color: "#00E676", dim: "rgba(0,230,118,0.15)", icon: "🏃", label: "Run", types: ["Run", "VirtualRun", "TrailRun"] },
};
const ZONE_COLORS = ["#3B82F6", "#22C55E", "#EAB308", "#F97316", "#EF4444"];
const RACE_KEYWORDS = ["race","triathlon","70.3","ironman","half iron","olympic tri","sprint tri","aquathlon","duathlon","hyrox","wildflower","escape","vineman","oceanside","santa cruz tri"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ═══════════════════════════════════════════════════════════════════════════════
// KNOWN RACES CONFIG — curated database of real events
// Matched against detected activities by keyword + distance.
// Add your own races here to get rich metadata shown in the Races tab.
// ═══════════════════════════════════════════════════════════════════════════════
const KNOWN_RACES = [
  // ── Ironman Full ──────────────────────────────────────────────────────────
  { id: "im-hawaii",           name: "Ironman World Championship",      series: "Ironman",     type: "Full",     location: "Kailua-Kona, HI",         keywords: ["kona","hawaii ironman","world championship"],           swim: 3.86, bike: 180.2, run: 42.2 },
  { id: "im-cda",              name: "Ironman Coeur d'Alene",           series: "Ironman",     type: "Full",     location: "Coeur d'Alene, ID",        keywords: ["coeur d'alene","cda ironman"],                          swim: 3.86, bike: 180.2, run: 42.2 },
  { id: "im-texas",            name: "Ironman Texas",                   series: "Ironman",     type: "Full",     location: "The Woodlands, TX",        keywords: ["ironman texas","woodlands ironman"],                    swim: 3.86, bike: 180.2, run: 42.2 },
  { id: "im-arizona",          name: "Ironman Arizona",                 series: "Ironman",     type: "Full",     location: "Tempe, AZ",                keywords: ["ironman arizona","imaz"],                               swim: 3.86, bike: 180.2, run: 42.2 },
  { id: "im-florida",          name: "Ironman Florida",                 series: "Ironman",     type: "Full",     location: "Panama City Beach, FL",    keywords: ["ironman florida","imfl"],                               swim: 3.86, bike: 180.2, run: 42.2 },
  { id: "im-chattanooga",      name: "Ironman Chattanooga",             series: "Ironman",     type: "Full",     location: "Chattanooga, TN",          keywords: ["ironman chattanooga","imchoo"],                         swim: 3.86, bike: 180.2, run: 42.2 },
  { id: "im-louisville",       name: "Ironman Louisville",              series: "Ironman",     type: "Full",     location: "Louisville, KY",           keywords: ["ironman louisville","imlou"],                           swim: 3.86, bike: 180.2, run: 42.2 },
  { id: "im-wisc",             name: "Ironman Wisconsin",               series: "Ironman",     type: "Full",     location: "Madison, WI",              keywords: ["ironman wisconsin","imwi"],                             swim: 3.86, bike: 180.2, run: 42.2 },
  { id: "im-md",               name: "Ironman Maryland",                series: "Ironman",     type: "Full",     location: "Cambridge, MD",            keywords: ["ironman maryland","immd"],                              swim: 3.86, bike: 180.2, run: 42.2 },
  { id: "im-mt",               name: "Ironman Mont-Tremblant",          series: "Ironman",     type: "Full",     location: "Mont-Tremblant, QC",       keywords: ["ironman mont-tremblant","immt"],                        swim: 3.86, bike: 180.2, run: 42.2 },
  { id: "im-canada",           name: "Ironman Canada",                  series: "Ironman",     type: "Full",     location: "Penticton, BC",            keywords: ["ironman canada","penticton"],                           swim: 3.86, bike: 180.2, run: 42.2 },
  // ── Ironman 70.3 ─────────────────────────────────────────────────────────
  { id: "im703-oceanside",     name: "Ironman 70.3 Oceanside",          series: "Ironman",     type: "70.3",     location: "Oceanside, CA",            keywords: ["oceanside","70.3 oceanside"],                           swim: 1.9, bike: 90, run: 21.1 },
  { id: "im703-santa-cruz",    name: "Ironman 70.3 Santa Cruz",         series: "Ironman",     type: "70.3",     location: "Santa Cruz, CA",           keywords: ["santa cruz 70.3","70.3 santa cruz","santa cruz tri"],   swim: 1.9, bike: 90, run: 21.1 },
  { id: "im703-eagleman",      name: "Ironman 70.3 Eagleman",           series: "Ironman",     type: "70.3",     location: "Cambridge, MD",            keywords: ["eagleman"],                                            swim: 1.9, bike: 90, run: 21.1 },
  { id: "im703-raleigh",       name: "Ironman 70.3 Raleigh",            series: "Ironman",     type: "70.3",     location: "Raleigh, NC",              keywords: ["raleigh 70.3","70.3 raleigh"],                          swim: 1.9, bike: 90, run: 21.1 },
  { id: "im703-vineman",       name: "Vineman 70.3",                    series: "Ironman",     type: "70.3",     location: "Windsor, CA",              keywords: ["vineman"],                                             swim: 1.9, bike: 90, run: 21.1 },
  { id: "im703-boulder",       name: "Ironman 70.3 Boulder",            series: "Ironman",     type: "70.3",     location: "Boulder, CO",              keywords: ["boulder 70.3","70.3 boulder"],                          swim: 1.9, bike: 90, run: 21.1 },
  { id: "im703-steelhead",     name: "Ironman 70.3 Steelhead",          series: "Ironman",     type: "70.3",     location: "Benton Harbor, MI",        keywords: ["steelhead"],                                           swim: 1.9, bike: 90, run: 21.1 },
  { id: "im703-mont-tremblant",name: "Ironman 70.3 Mont-Tremblant",     series: "Ironman",     type: "70.3",     location: "Mont-Tremblant, QC",       keywords: ["70.3 mont-tremblant"],                                 swim: 1.9, bike: 90, run: 21.1 },
  { id: "im703-austin",        name: "Ironman 70.3 Austin",             series: "Ironman",     type: "70.3",     location: "Austin, TX",               keywords: ["austin 70.3","70.3 austin"],                            swim: 1.9, bike: 90, run: 21.1 },
  { id: "im703-waco",          name: "Ironman 70.3 Waco",               series: "Ironman",     type: "70.3",     location: "Waco, TX",                 keywords: ["waco 70.3","70.3 waco"],                                swim: 1.9, bike: 90, run: 21.1 },
  { id: "im703-florida",       name: "Ironman 70.3 Florida",            series: "Ironman",     type: "70.3",     location: "Haines City, FL",          keywords: ["florida 70.3","70.3 florida"],                          swim: 1.9, bike: 90, run: 21.1 },
  { id: "im703-worlds",        name: "Ironman 70.3 World Championship", series: "Ironman",     type: "70.3",     location: "Various",                  keywords: ["70.3 world championship","worlds 70.3"],                swim: 1.9, bike: 90, run: 21.1 },
  { id: "im703-cda",           name: "Ironman 70.3 Coeur d'Alene",      series: "Ironman",     type: "70.3",     location: "Coeur d'Alene, ID",        keywords: ["70.3 coeur d'alene","70.3 cda"],                        swim: 1.9, bike: 90, run: 21.1 },
  { id: "im703-chattanooga",   name: "Ironman 70.3 Chattanooga",        series: "Ironman",     type: "70.3",     location: "Chattanooga, TN",          keywords: ["70.3 chattanooga","choo 70.3"],                         swim: 1.9, bike: 90, run: 21.1 },
  { id: "im703-new-orleans",   name: "Ironman 70.3 New Orleans",        series: "Ironman",     type: "70.3",     location: "New Orleans, LA",          keywords: ["new orleans 70.3","70.3 new orleans"],                  swim: 1.9, bike: 90, run: 21.1 },
  // ── Challenge Series ──────────────────────────────────────────────────────
  { id: "challenge-roth",      name: "Challenge Roth",                  series: "Challenge",   type: "Full",     location: "Roth, Germany",            keywords: ["challenge roth","roth"],                                swim: 3.86, bike: 180, run: 42.2 },
  // ── Olympic / Sprint / Local ──────────────────────────────────────────────
  { id: "escape-alcatraz",     name: "Escape from Alcatraz Triathlon",  series: "Independent", type: "Olympic",  location: "San Francisco, CA",        keywords: ["escape from alcatraz","alcatraz"],                      swim: 2.4, bike: 29, run: 13 },
  { id: "wildflower",          name: "Wildflower Triathlon",            series: "Independent", type: "Olympic",  location: "Lake San Antonio, CA",     keywords: ["wildflower"],                                           swim: 1.5, bike: 40, run: 10 },
  { id: "chicago-tri",         name: "Chicago Triathlon",               series: "Independent", type: "Olympic",  location: "Chicago, IL",              keywords: ["chicago triathlon","chicago tri"],                       swim: 1.5, bike: 40, run: 10 },
  { id: "new-york-tri",        name: "New York City Triathlon",         series: "Independent", type: "Olympic",  location: "New York, NY",             keywords: ["new york triathlon","nyc tri"],                          swim: 1.5, bike: 40, run: 10 },
  { id: "pacific-grove",       name: "Pacific Grove Triathlon",         series: "Independent", type: "Olympic",  location: "Pacific Grove, CA",        keywords: ["pacific grove"],                                        swim: 1.5, bike: 40, run: 10 },
  // ── Hyrox ─────────────────────────────────────────────────────────────────
  { id: "hyrox",               name: "Hyrox",                           series: "Hyrox",       type: "Hyrox",    location: "Various",                  keywords: ["hyrox"],                                                swim: 0, bike: 0, run: 8 },
  // ── Aquathlon / Duathlon ──────────────────────────────────────────────────
  { id: "aquathlon",           name: "Aquathlon",                       series: "USAT",        type: "Aquathlon",location: "Various",                  keywords: ["aquathlon"],                                            swim: 0.75, bike: 0, run: 5 },
  { id: "duathlon",            name: "Duathlon",                        series: "USAT",        type: "Duathlon", location: "Various",                  keywords: ["duathlon"],                                             swim: 0, bike: 40, run: 10 },
];

const SERIES_COLORS = {
  Ironman:     { bg: "rgba(252,76,2,0.15)",  text: "#FC4C02" },
  Challenge:   { bg: "rgba(30,180,100,0.15)",text: "#1EB464" },
  Hyrox:       { bg: "rgba(234,179,8,0.15)", text: "#EAB308" },
  USAT:        { bg: "rgba(59,130,246,0.15)",text: "#3B82F6" },
  Independent: { bg: "rgba(168,85,247,0.12)",text: "#A855F7" },
  Abbott:      { bg: "rgba(0,212,255,0.12)", text: "#00D4FF" },
  NYRR:        { bg: "rgba(0,230,118,0.12)", text: "#00E676" },
  RunDisney:   { bg: "rgba(234,179,8,0.12)", text: "#EAB308" },
  Major:       { bg: "rgba(255,255,255,0.05)", text: "rgba(255,255,255,0.45)" },
};

// ═══════════════════════════════════════════════════════════════════════════════
// ROAD RACE DATABASE — marathons & half marathons with GPS start coords
// lat/lng = race start line; matched against Strava activity start_latlng
// within LOCATION_MATCH_KM radius. Add your own races here.
// ═══════════════════════════════════════════════════════════════════════════════
const LOCATION_MATCH_KM = 5;

const KNOWN_ROAD_RACES = [
  // ── World Marathon Majors ─────────────────────────────────────────────────
  { id: "boston",        name: "Boston Marathon",                    series: "Abbott",    type: "Marathon",     location: "Boston, MA",          lat: 42.2977, lng: -71.5224, keywords: ["boston marathon"] },
  { id: "nyc-marathon",  name: "TCS New York City Marathon",         series: "Abbott",    type: "Marathon",     location: "New York, NY",         lat: 40.6013, lng: -74.0552, keywords: ["new york marathon","nyc marathon","tcs nyc marathon"] },
  { id: "chicago-m",     name: "Bank of America Chicago Marathon",   series: "Abbott",    type: "Marathon",     location: "Chicago, IL",          lat: 41.8828, lng: -87.6233, keywords: ["chicago marathon"] },
  { id: "london",        name: "TCS London Marathon",                series: "Abbott",    type: "Marathon",     location: "London, UK",           lat: 51.4884, lng: -0.0003,  keywords: ["london marathon","tcs london"] },
  { id: "berlin",        name: "BMW Berlin Marathon",                series: "Abbott",    type: "Marathon",     location: "Berlin, Germany",      lat: 52.5145, lng: 13.3499,  keywords: ["berlin marathon","bmw berlin"] },
  { id: "tokyo",         name: "Tokyo Marathon",                     series: "Abbott",    type: "Marathon",     location: "Tokyo, Japan",         lat: 35.6815, lng: 139.7667, keywords: ["tokyo marathon"] },
  // ── US Marathons ──────────────────────────────────────────────────────────
  { id: "la-marathon",   name: "Los Angeles Marathon",               series: "Major",     type: "Marathon",     location: "Los Angeles, CA",      lat: 34.0736, lng: -118.2400,keywords: ["los angeles marathon","la marathon"] },
  { id: "marine",        name: "Marine Corps Marathon",              series: "Major",     type: "Marathon",     location: "Arlington, VA",        lat: 38.8735, lng: -77.0663, keywords: ["marine corps marathon","mcm"] },
  { id: "sf-marathon",   name: "San Francisco Marathon",             series: "Major",     type: "Marathon",     location: "San Francisco, CA",    lat: 37.8079, lng: -122.4169,keywords: ["san francisco marathon","sf marathon"] },
  { id: "big-sur-m",     name: "Big Sur International Marathon",     series: "Major",     type: "Marathon",     location: "Big Sur, CA",          lat: 36.5285, lng: -121.9297,keywords: ["big sur marathon","big sur international"] },
  { id: "cim",           name: "California International Marathon",  series: "Major",     type: "Marathon",     location: "Folsom, CA",           lat: 38.6618, lng: -121.1741,keywords: ["california international marathon","cim"] },
  { id: "houston-m",     name: "Chevron Houston Marathon",           series: "Major",     type: "Marathon",     location: "Houston, TX",          lat: 29.7604, lng: -95.3700, keywords: ["houston marathon","chevron houston"] },
  { id: "disney-m",      name: "Walt Disney World Marathon",         series: "RunDisney", type: "Marathon",     location: "Orlando, FL",          lat: 28.3725, lng: -81.5546, keywords: ["disney world marathon","rundisney marathon","disney marathon"] },
  { id: "twin-cities",   name: "Medtronic Twin Cities Marathon",     series: "Major",     type: "Marathon",     location: "Minneapolis, MN",      lat: 44.9726, lng: -93.2716, keywords: ["twin cities marathon","medtronic twin cities"] },
  { id: "philly-m",      name: "Philadelphia Marathon",              series: "Major",     type: "Marathon",     location: "Philadelphia, PA",     lat: 39.9656, lng: -75.1810, keywords: ["philadelphia marathon","philly marathon"] },
  { id: "portland-m",    name: "Portland Marathon",                  series: "Major",     type: "Marathon",     location: "Portland, OR",         lat: 45.5051, lng: -122.6707,keywords: ["portland marathon"] },
  { id: "seattle-m",     name: "Seattle Marathon",                   series: "Major",     type: "Marathon",     location: "Seattle, WA",          lat: 47.5801, lng: -122.3443,keywords: ["seattle marathon"] },
  { id: "denver-m",      name: "Colfax Marathon",                    series: "Major",     type: "Marathon",     location: "Denver, CO",           lat: 39.7467, lng: -104.9517,keywords: ["colfax marathon","denver marathon"] },
  { id: "austin-m",      name: "3M Austin Marathon",                 series: "Major",     type: "Marathon",     location: "Austin, TX",           lat: 30.2672, lng: -97.7431, keywords: ["austin marathon","3m austin"] },
  { id: "miami-m",       name: "Life Time Miami Marathon",           series: "Major",     type: "Marathon",     location: "Miami, FL",            lat: 25.7617, lng: -80.1918, keywords: ["miami marathon","life time miami"] },
  { id: "rnr-vegas",     name: "Rock 'n' Roll Las Vegas Marathon",   series: "Major",     type: "Marathon",     location: "Las Vegas, NV",        lat: 36.1699, lng: -115.1398,keywords: ["las vegas marathon","rock n roll vegas","rnr vegas"] },
  { id: "grandmas",      name: "Grandma's Marathon",                 series: "Major",     type: "Marathon",     location: "Duluth, MN",           lat: 47.0394, lng: -91.6576, keywords: ["grandma's marathon","grandmas marathon"] },
  // ── International Marathons ───────────────────────────────────────────────
  { id: "paris-m",       name: "Schneider Electric Paris Marathon",  series: "Major",     type: "Marathon",     location: "Paris, France",        lat: 48.8698, lng: 2.3078,   keywords: ["paris marathon"] },
  { id: "amsterdam-m",   name: "TCS Amsterdam Marathon",             series: "Major",     type: "Marathon",     location: "Amsterdam, Netherlands",lat: 52.3676, lng: 4.9041,  keywords: ["amsterdam marathon","tcs amsterdam"] },
  { id: "sydney-m",      name: "Sydney Running Festival Marathon",   series: "Major",     type: "Marathon",     location: "Sydney, Australia",    lat: -33.8688, lng: 151.2093,keywords: ["sydney marathon","sydney running festival"] },
  // ── US Half Marathons ─────────────────────────────────────────────────────
  { id: "nyc-half",      name: "United Airlines NYC Half",           series: "NYRR",      type: "Half Marathon",location: "New York, NY",         lat: 40.7658, lng: -73.9777, keywords: ["nyc half","new york city half","united airlines nyc half"] },
  { id: "brooklyn-half", name: "Brooklyn Half Marathon",             series: "NYRR",      type: "Half Marathon",location: "Brooklyn, NY",         lat: 40.6603, lng: -73.9683, keywords: ["brooklyn half","brooklyn half marathon"] },
  { id: "sf-half",       name: "San Francisco Half Marathon",        series: "Major",     type: "Half Marathon",location: "San Francisco, CA",    lat: 37.8079, lng: -122.4169,keywords: ["san francisco half","sf half marathon"] },
  { id: "chicago-half",  name: "Chicago Half Marathon",              series: "Major",     type: "Half Marathon",location: "Chicago, IL",          lat: 41.8303, lng: -87.6167, keywords: ["chicago half marathon"] },
  { id: "la-half",       name: "LA Big 5K/Half",                     series: "Major",     type: "Half Marathon",location: "Los Angeles, CA",      lat: 34.0736, lng: -118.2400,keywords: ["la half marathon","los angeles half"] },
  { id: "philly-half",   name: "Philadelphia Half Marathon",         series: "Major",     type: "Half Marathon",location: "Philadelphia, PA",     lat: 39.9526, lng: -75.1652, keywords: ["philadelphia half","philly half"] },
  { id: "rnr-la-half",   name: "Rock 'n' Roll Los Angeles Half",     series: "Major",     type: "Half Marathon",location: "Los Angeles, CA",      lat: 34.0522, lng: -118.2437,keywords: ["rock n roll la half","rnr la half"] },
  { id: "dopey-half",    name: "Walt Disney World Half Marathon",    series: "RunDisney", type: "Half Marathon",location: "Orlando, FL",          lat: 28.3725, lng: -81.5546, keywords: ["disney half","rundisney half","dopey"] },
  { id: "dc-half",       name: "United Airlines DC Half",            series: "Major",     type: "Half Marathon",location: "Washington, DC",       lat: 38.8899, lng: -77.0091, keywords: ["dc half","washington half","rock n roll dc"] },
  { id: "houston-half",  name: "Chevron Houston Half Marathon",      series: "Major",     type: "Half Marathon",location: "Houston, TX",          lat: 29.7604, lng: -95.3700, keywords: ["houston half","chevron houston half"] },
  { id: "nyc-marathon-half", name: "New York Half Marathon",         series: "NYRR",      type: "Half Marathon",location: "New York, NY",         lat: 40.7749, lng: -73.9760, keywords: ["new york half marathon","nyrr half"] },
];

// Haversine distance in km between two lat/lng points
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Detect standalone marathon / half marathon runs (not triathlon legs)
const TRI_NAME_KEYWORDS = ["ironman","triathlon","70.3"," tri ","tri -","duathlon"];
function detectRoadRaces(activities) {
  const MARATHON_MIN = 41500, MARATHON_MAX = 44500;
  const HALF_MIN = 20000, HALF_MAX = 22800;

  const results = [];
  activities.forEach(a => {
    if (classifySport(a) !== "run") return;
    const dist = a.distance || 0;
    const isMarathon = dist >= MARATHON_MIN && dist <= MARATHON_MAX;
    const isHalf = dist >= HALF_MIN && dist <= HALF_MAX;
    if (!isMarathon && !isHalf) return;

    // Skip if this is a triathlon run leg
    const nameLower = (a.name || "").toLowerCase();
    if (TRI_NAME_KEYWORDS.some(kw => nameLower.includes(kw))) return;

    const raceType = isMarathon ? "Marathon" : "Half Marathon";
    const date = a.start_date_local?.slice(0, 10) || a.start_date?.slice(0, 10);
    const latlng = a.start_latlng; // [lat, lng] from real Strava data

    const candidates = KNOWN_ROAD_RACES.filter(r => r.type === raceType);
    let known = null;

    // 1. GPS location match (most reliable — real Strava data has start_latlng)
    if (latlng?.length === 2) {
      let bestKm = Infinity;
      for (const c of candidates) {
        const km = haversineKm(latlng[0], latlng[1], c.lat, c.lng);
        if (km < LOCATION_MATCH_KM && km < bestKm) { bestKm = km; known = c; }
      }
    }

    // 2. Name keyword match
    if (!known) {
      for (const c of candidates) {
        if (c.keywords.some(kw => nameLower.includes(kw))) { known = c; break; }
      }
    }

    results.push({
      date,
      name: known ? known.name : (a.name || raceType),
      type: raceType,
      series: known?.series || "Independent",
      location: known?.location,
      knownRef: known,
      category: "road",
      activity: a,
      totalTime: a.elapsed_time || a.moving_time || 0,
      totalDist: dist,
    });
  });

  return results.sort((a, b) => new Date(b.date) - new Date(a.date));
}

// Try to match detected race activities to a KNOWN_RACES entry
function matchKnownRace(activityNames, bikeDistKm) {
  const combined = activityNames.join(" ").toLowerCase();
  let best = null, bestScore = 0;
  for (const known of KNOWN_RACES) {
    const hits = known.keywords.filter(kw => combined.includes(kw)).length;
    if (hits === 0) continue;
    let score = hits * 10;
    if (known.bike > 0 && bikeDistKm > 0) {
      score += (Math.min(bikeDistKm, known.bike) / Math.max(bikeDistKm, known.bike)) * 5;
    }
    if (score > bestScore) { bestScore = score; best = known; }
  }
  return best;
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════
function classifySport(activity) {
  const t = activity.sport_type || activity.type || "";
  for (const [key, s] of Object.entries(SPORT)) {
    if (s.types.includes(t)) return key;
  }
  return null;
}

function fmtDuration(seconds) {
  if (!seconds) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  return `${m}:${String(s).padStart(2,"0")}`;
}

function fmtPace(metersPerSec, sport) {
  if (!metersPerSec || metersPerSec === 0) return "—";
  if (sport === "swim") {
    const secPer100 = 100 / metersPerSec;
    return `${Math.floor(secPer100 / 60)}:${String(Math.floor(secPer100 % 60)).padStart(2,"0")}/100m`;
  }
  if (sport === "bike") return `${(metersPerSec * 3.6).toFixed(1)} km/h`;
  if (sport === "run") {
    const secPerKm = 1000 / metersPerSec;
    return `${Math.floor(secPerKm / 60)}:${String(Math.floor(secPerKm % 60)).padStart(2,"0")}/km`;
  }
  return `${(metersPerSec * 3.6).toFixed(1)} km/h`;
}

function paceValue(metersPerSec, sport) {
  if (!metersPerSec) return null;
  if (sport === "swim") return +(100 / metersPerSec / 60).toFixed(2); // min/100m
  if (sport === "bike") return +(metersPerSec * 3.6).toFixed(1); // km/h
  if (sport === "run") return +(1000 / metersPerSec / 60).toFixed(2); // min/km
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RACE DETECTION — groups same-day swim→bike→run into race or brick events
// ═══════════════════════════════════════════════════════════════════════════════
function detectRaces(activities) {
  const byDate = {};
  activities.forEach(a => {
    const sport = classifySport(a);
    if (!sport) return;
    const date = a.start_date_local?.slice(0, 10) || a.start_date?.slice(0, 10);
    if (!date) return;
    if (!byDate[date]) byDate[date] = [];
    byDate[date].push({ ...a, _sport: sport });
  });

  const races = [];
  Object.entries(byDate).forEach(([date, acts]) => {
    const sports = new Set(acts.map(a => a._sport));
    const hasRaceKeyword = acts.some(a => RACE_KEYWORDS.some(kw => (a.name || "").toLowerCase().includes(kw)));
    const triSports = ["swim","bike","run"].filter(s => sports.has(s));

    // Need at least 2 disciplines, or 1 + a race keyword
    if (triSports.length < 2 && !(triSports.length >= 1 && hasRaceKeyword)) return;

    const legs = {};
    triSports.forEach(s => {
      const matching = acts.filter(a => a._sport === s).sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
      legs[s] = matching[0];
    });

    const totalTime = Object.values(legs).reduce((sum, a) => sum + (a.elapsed_time || a.moving_time || 0), 0);
    const totalDist = Object.values(legs).reduce((sum, a) => sum + (a.distance || 0), 0);
    const bikeDistKm = legs.bike ? (legs.bike.distance || 0) / 1000 : 0;

    // Try to match against known races config first
    const allNames = acts.map(a => a.name || "");
    const known = matchKnownRace(allNames, bikeDistKm);

    let name, raceType, series, location, knownRef;
    if (known) {
      name = known.name;
      raceType = known.type;
      series = known.series;
      location = known.location;
      knownRef = known;
    } else if (hasRaceKeyword) {
      // Named as a race but not in config — infer from distance
      const namedAct = acts.find(a => RACE_KEYWORDS.some(kw => (a.name || "").toLowerCase().includes(kw))) || acts[0];
      name = namedAct.name || `Race - ${date}`;
      series = "Independent";
      if (bikeDistKm > 150) raceType = "Full";
      else if (bikeDistKm > 70) raceType = "70.3";
      else if (bikeDistKm > 30) raceType = "Olympic";
      else raceType = "Sprint";
    } else {
      // Same-day multi-sport but no race keyword — label as Brick Workout, not a race
      raceType = "Brick";
      series = "Training";
      const longestAct = acts.reduce((best, a) => (a.moving_time || 0) > (best.moving_time || 0) ? a : best, acts[0]);
      name = longestAct.name || `Brick - ${date}`;
    }

    races.push({ date, name, type: raceType, series: series || "Independent", location, legs, totalTime, totalDist, sports: triSports, knownRef });
  });

  return races.sort((a, b) => new Date(b.date) - new Date(a.date));
}

// ═══════════════════════════════════════════════════════════════════════════════
// STRAVA API LAYER
// ═══════════════════════════════════════════════════════════════════════════════
async function exchangeToken(code) {
  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
    }),
  });
  return res.json();
}

async function refreshToken(token) {
  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      refresh_token: token,
      grant_type: "refresh_token",
    }),
  });
  return res.json();
}

async function fetchAllActivities(accessToken, onProgress) {
  let page = 1;
  let all = [];
  while (true) {
    const res = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?per_page=200&page=${page}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) throw new Error(`Strava API error: ${res.status}`);
    const data = await res.json();
    if (!data.length) break;
    all = all.concat(data);
    onProgress?.(all.length);
    page++;
  }
  return all;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEMO DATA (for preview without Strava connection)
// ═══════════════════════════════════════════════════════════════════════════════
function generateDemoData() {
  const activities = [];
  let id = 1;
  for (let y = 2020; y <= 2025; y++) {
    const maxMonth = y === 2025 ? 2 : 11;
    for (let m = 0; m <= maxMonth; m++) {
      const base = (y - 2019) * 0.15 + 0.7;
      const seasonal = 1 + 0.25 * Math.sin((m - 2) * Math.PI / 6);
      const n = () => 0.8 + Math.random() * 0.4;
      // Swim sessions
      for (let s = 0; s < Math.round(6 * base * n()); s++) {
        const day = Math.min(28, 1 + Math.floor(Math.random() * 28));
        const dist = (2000 + Math.random() * 1500) * base * n();
        const time = dist / (1.4 + (y - 2020) * 0.03 + Math.random() * 0.15);
        activities.push({
          id: id++, name: `Pool Swim`, type: "Swim", sport_type: "Swim",
          start_date_local: `${y}-${String(m+1).padStart(2,"0")}-${String(day).padStart(2,"0")}T07:00:00Z`,
          start_date: `${y}-${String(m+1).padStart(2,"0")}-${String(day).padStart(2,"0")}T15:00:00Z`,
          distance: dist, moving_time: time, elapsed_time: time * 1.05,
          average_speed: dist / time,
          average_heartrate: 135 + Math.random() * 20,
          max_heartrate: 165 + Math.random() * 15,
          total_elevation_gain: 0,
          suffer_score: Math.round(40 + Math.random() * 60),
        });
      }
      // Bike sessions
      for (let s = 0; s < Math.round(8 * base * n() * seasonal); s++) {
        const day = Math.min(28, 1 + Math.floor(Math.random() * 28));
        const dist = (30000 + Math.random() * 50000) * base * n() * seasonal;
        const speed = (7.5 + (y - 2020) * 0.2 + Math.random() * 1) ; // m/s
        activities.push({
          id: id++, name: s === 0 && m % 3 === 0 ? "Long Ride" : "Ride", type: "Ride", sport_type: "Ride",
          start_date_local: `${y}-${String(m+1).padStart(2,"0")}-${String(day).padStart(2,"0")}T08:00:00Z`,
          start_date: `${y}-${String(m+1).padStart(2,"0")}-${String(day).padStart(2,"0")}T16:00:00Z`,
          distance: dist, moving_time: dist / speed, elapsed_time: dist / speed * 1.08,
          average_speed: speed,
          average_heartrate: 140 + Math.random() * 18,
          max_heartrate: 172 + Math.random() * 12,
          total_elevation_gain: dist / 1000 * (8 + Math.random() * 12),
          suffer_score: Math.round(60 + Math.random() * 100),
        });
      }
      // Run sessions
      for (let s = 0; s < Math.round(10 * base * n() * seasonal); s++) {
        const day = Math.min(28, 1 + Math.floor(Math.random() * 28));
        const dist = (5000 + Math.random() * 12000) * base * n();
        const speed = (2.8 + (y - 2020) * 0.06 + Math.random() * 0.3);
        activities.push({
          id: id++, name: dist > 18000 ? "Long Run" : "Run", type: "Run", sport_type: "Run",
          start_date_local: `${y}-${String(m+1).padStart(2,"0")}-${String(day).padStart(2,"0")}T06:30:00Z`,
          start_date: `${y}-${String(m+1).padStart(2,"0")}-${String(day).padStart(2,"0")}T14:30:00Z`,
          distance: dist, moving_time: dist / speed, elapsed_time: dist / speed * 1.05,
          average_speed: speed,
          average_heartrate: 148 + Math.random() * 16,
          max_heartrate: 178 + Math.random() * 10,
          total_elevation_gain: dist / 1000 * (5 + Math.random() * 10),
          suffer_score: Math.round(50 + Math.random() * 80),
        });
      }
      // Inject a half marathon in March and a marathon in November
      if (m === 2 && y >= 2021) { // March = half marathon
        const day = 12;
        const dateStr = `${y}-03-${String(day).padStart(2,"0")}`;
        const speed = 3.2 + (y - 2021) * 0.04;
        const dist = 21097;
        activities.push({
          id: id++, name: "SF Half Marathon", type: "Run", sport_type: "Run",
          start_date_local: `${dateStr}T07:30:00Z`, start_date: `${dateStr}T15:30:00Z`,
          start_latlng: [37.8079, -122.4169],
          distance: dist, moving_time: dist / speed, elapsed_time: dist / speed * 1.02,
          average_speed: speed, average_heartrate: 168, max_heartrate: 182,
          total_elevation_gain: 180, suffer_score: 160,
        });
      }
      if (m === 10 && y >= 2022) { // November = marathon
        const day = 5;
        const dateStr = `${y}-11-${String(day).padStart(2,"0")}`;
        const speed = 2.9 + (y - 2022) * 0.03;
        const dist = 42195;
        const names = { 2022: "NYC Marathon", 2023: "California International Marathon", 2024: "NYC Marathon", 2025: "Boston Marathon" };
        const latlngs = { 2022: [40.6013, -74.0552], 2023: [38.6618, -121.1741], 2024: [40.6013, -74.0552], 2025: [42.2977, -71.5224] };
        activities.push({
          id: id++, name: names[y] || "Marathon", type: "Run", sport_type: "Run",
          start_date_local: `${dateStr}T08:00:00Z`, start_date: `${dateStr}T16:00:00Z`,
          start_latlng: latlngs[y] || [40.6013, -74.0552],
          distance: dist, moving_time: dist / speed, elapsed_time: dist / speed * 1.015,
          average_speed: speed, average_heartrate: 162, max_heartrate: 178,
          total_elevation_gain: 310, suffer_score: 220,
        });
      }
      // Inject race days (2 per year in season)
      if ([5, 8].includes(m) && y >= 2022) {
        const day = 15;
        const dateStr = `${y}-${String(m+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
        const raceNames = { 5: "Sprint Triathlon", 8: y % 2 === 0 ? "Ironman 70.3 Santa Cruz" : "Olympic Triathlon" };
        const is703 = raceNames[m].includes("70.3");
        activities.push({
          id: id++, name: `${raceNames[m]} - Swim`, type: "Swim", sport_type: "Swim",
          start_date_local: `${dateStr}T07:00:00Z`, start_date: `${dateStr}T15:00:00Z`,
          distance: is703 ? 1930 : m === 5 ? 750 : 1500,
          moving_time: is703 ? 1950 : m === 5 ? 620 : 1400,
          elapsed_time: is703 ? 2020 : m === 5 ? 650 : 1450,
          average_speed: is703 ? 0.99 : 1.1, average_heartrate: 155, max_heartrate: 172,
          total_elevation_gain: 0, suffer_score: 85,
        });
        activities.push({
          id: id++, name: `${raceNames[m]} - Bike`, type: "Ride", sport_type: "Ride",
          start_date_local: `${dateStr}T07:35:00Z`, start_date: `${dateStr}T15:35:00Z`,
          distance: is703 ? 90000 : m === 5 ? 20000 : 40000,
          moving_time: is703 ? 9600 : m === 5 ? 2100 : 4200,
          elapsed_time: is703 ? 9900 : m === 5 ? 2200 : 4400,
          average_speed: is703 ? 9.4 : 9.0, average_heartrate: 152, max_heartrate: 168,
          total_elevation_gain: is703 ? 850 : 200, suffer_score: 150,
        });
        activities.push({
          id: id++, name: `${raceNames[m]} - Run`, type: "Run", sport_type: "Run",
          start_date_local: `${dateStr}T10:15:00Z`, start_date: `${dateStr}T18:15:00Z`,
          distance: is703 ? 21100 : m === 5 ? 5000 : 10000,
          moving_time: is703 ? 6200 : m === 5 ? 1350 : 2800,
          elapsed_time: is703 ? 6400 : m === 5 ? 1400 : 2900,
          average_speed: is703 ? 3.4 : 3.6, average_heartrate: 162, max_heartrate: 180,
          total_elevation_gain: is703 ? 120 : 30, suffer_score: 130,
        });
      }
    }
  }
  return activities;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATA PROCESSING
// ═══════════════════════════════════════════════════════════════════════════════
function processActivities(activities) {
  const triActivities = activities.filter(a => classifySport(a) !== null);
  const years = [...new Set(triActivities.map(a => new Date(a.start_date_local || a.start_date).getFullYear()))].sort();
  
  const byYearMonth = {};
  triActivities.forEach(a => {
    const d = new Date(a.start_date_local || a.start_date);
    const ym = `${d.getFullYear()}-${d.getMonth()}`;
    const sport = classifySport(a);
    if (!byYearMonth[ym]) byYearMonth[ym] = { swim: [], bike: [], run: [] };
    if (sport) byYearMonth[ym][sport].push(a);
  });

  // Monthly aggregates per year
  const monthlyByYear = {};
  years.forEach(y => {
    monthlyByYear[y] = MONTHS.map((label, m) => {
      const key = `${y}-${m}`;
      const data = byYearMonth[key] || { swim: [], bike: [], run: [] };
      const agg = (arr, field) => arr.reduce((s, a) => s + (a[field] || 0), 0);
      const avgField = (arr, field) => arr.length ? arr.reduce((s, a) => s + (a[field] || 0), 0) / arr.length : 0;
      return {
        month: label, monthIdx: m,
        swimDist: +(agg(data.swim, "distance") / 1000).toFixed(1),
        bikeDist: +(agg(data.bike, "distance") / 1000).toFixed(0),
        runDist: +(agg(data.run, "distance") / 1000).toFixed(1),
        swimTime: +(agg(data.swim, "moving_time") / 3600).toFixed(1),
        bikeTime: +(agg(data.bike, "moving_time") / 3600).toFixed(1),
        runTime: +(agg(data.run, "moving_time") / 3600).toFixed(1),
        swimSessions: data.swim.length,
        bikeSessions: data.bike.length,
        runSessions: data.run.length,
        swimPace: avgField(data.swim, "average_speed"),
        bikePace: avgField(data.bike, "average_speed"),
        runPace: avgField(data.run, "average_speed"),
        avgHR: avgField([...data.swim, ...data.bike, ...data.run], "average_heartrate"),
        sufferScore: agg([...data.swim, ...data.bike, ...data.run], "suffer_score"),
        elevation: +(agg([...data.swim, ...data.bike, ...data.run], "total_elevation_gain")).toFixed(0),
      };
    });
  });

  // Weekly for last N weeks
  const now = new Date();
  const weeklyData = [];
  for (let w = 11; w >= 0; w--) {
    const weekStart = new Date(now.getTime() - (w + 1) * 7 * 86400000);
    const weekEnd = new Date(now.getTime() - w * 7 * 86400000);
    const label = weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const weekActs = triActivities.filter(a => {
      const d = new Date(a.start_date_local || a.start_date);
      return d >= weekStart && d < weekEnd;
    });
    const byS = { swim: [], bike: [], run: [] };
    weekActs.forEach(a => { const s = classifySport(a); if (s) byS[s].push(a); });
    weeklyData.push({
      week: label,
      swim: +(byS.swim.reduce((s, a) => s + (a.moving_time || 0), 0) / 3600).toFixed(1),
      bike: +(byS.bike.reduce((s, a) => s + (a.moving_time || 0), 0) / 3600).toFixed(1),
      run: +(byS.run.reduce((s, a) => s + (a.moving_time || 0), 0) / 3600).toFixed(1),
    });
  }

  // Pace trends (rolling 4-week average per sport)
  const paceByWeek = [];
  for (let w = 25; w >= 0; w--) {
    const end = new Date(now.getTime() - w * 7 * 86400000);
    const start = new Date(end.getTime() - 28 * 86400000);
    const label = end.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const window = triActivities.filter(a => {
      const d = new Date(a.start_date_local || a.start_date);
      return d >= start && d < end;
    });
    const byS = { swim: [], bike: [], run: [] };
    window.forEach(a => { const s = classifySport(a); if (s) byS[s].push(a); });
    const avg = (arr) => arr.length ? arr.reduce((s, a) => s + (a.average_speed || 0), 0) / arr.length : null;
    paceByWeek.push({
      week: label,
      swimPace: paceValue(avg(byS.swim), "swim"),
      bikeSpeed: paceValue(avg(byS.bike), "bike"),
      runPace: paceValue(avg(byS.run), "run"),
    });
  }

  // HR distribution (approximate zones from average_heartrate)
  const allHRs = triActivities.filter(a => a.average_heartrate).map(a => a.average_heartrate);
  const maxHR = allHRs.length ? Math.max(...triActivities.filter(a => a.max_heartrate).map(a => a.max_heartrate)) : 185;
  const zones = [0, 0, 0, 0, 0];
  allHRs.forEach(hr => {
    const pct = hr / maxHR;
    if (pct < 0.6) zones[0]++;
    else if (pct < 0.7) zones[1]++;
    else if (pct < 0.8) zones[2]++;
    else if (pct < 0.9) zones[3]++;
    else zones[4]++;
  });
  const total = Math.max(1, zones.reduce((a, b) => a + b, 0));
  const zoneData = [
    { zone: "Z1 Recovery", pct: Math.round(zones[0] / total * 100) },
    { zone: "Z2 Endurance", pct: Math.round(zones[1] / total * 100) },
    { zone: "Z3 Tempo", pct: Math.round(zones[2] / total * 100) },
    { zone: "Z4 Threshold", pct: Math.round(zones[3] / total * 100) },
    { zone: "Z5 VO2max", pct: Math.round(zones[4] / total * 100) },
  ];

  // Races
  const races = detectRaces(triActivities);

  // Personal bests per discipline
  const pbs = {};
  ["swim", "bike", "run"].forEach(sport => {
    const acts = triActivities.filter(a => classifySport(a) === sport && a.distance && a.moving_time);
    if (!acts.length) return;
    // fastest avg speed
    const fastest = acts.reduce((best, a) => (!best || (a.average_speed || 0) > (best.average_speed || 0)) ? a : best, null);
    // longest
    const longest = acts.reduce((best, a) => (!best || a.distance > best.distance) ? a : best, null);
    pbs[sport] = { fastest, longest };
  });

  const roadRaces = detectRoadRaces(triActivities);

  return { triActivities, years, monthlyByYear, weeklyData, paceByWeek, zoneData, races, roadRaces, pbs, maxHR };
}

// ═══════════════════════════════════════════════════════════════════════════════
// UI COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════
const Pill = ({ options, value, onChange, small }) => (
  <div style={{ display: "flex", background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: 3, gap: 2, flexWrap: "wrap" }}>
    {options.map(o => (
      <button key={o.value} onClick={() => onChange(o.value)} style={{
        padding: small ? "4px 10px" : "6px 14px", borderRadius: 8, border: "none", cursor: "pointer",
        fontSize: small ? 11 : 12, fontWeight: 500, fontFamily: "'Outfit', sans-serif",
        transition: "all 0.2s",
        background: value === o.value ? "rgba(255,255,255,0.12)" : "transparent",
        color: value === o.value ? "#fff" : "rgba(255,255,255,0.4)",
      }}>{o.label}</button>
    ))}
  </div>
);

const Card = ({ children, style, accent }) => (
  <div style={{
    background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 16, padding: "18px 20px", position: "relative", overflow: "hidden", ...style,
  }}>
    {accent && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${accent}, transparent)` }} />}
    {children}
  </div>
);

const ScopeTag = ({ label, color }) => (
  <span style={{
    fontSize: 9, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase",
    padding: "2px 7px", borderRadius: 6,
    background: color === "season" ? "rgba(0,212,255,0.1)" : color === "rolling" ? "rgba(255,140,0,0.1)" : "rgba(255,255,255,0.05)",
    color: color === "season" ? "#00D4FF" : color === "rolling" ? "#FF8C00" : "rgba(255,255,255,0.3)",
    fontFamily: "'DM Mono', monospace",
  }}>{label}</span>
);

const Section = ({ title, right, children, scope }) => (
  <div style={{ marginTop: 28 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: "#fff", fontFamily: "'Outfit', sans-serif", margin: 0, letterSpacing: -0.3 }}>{title}</h2>
        {scope === "season"  && <ScopeTag label="Season" color="season" />}
        {scope === "rolling" && <ScopeTag label="Rolling" color="rolling" />}
        {scope === "alltime" && <ScopeTag label="All-time" color="alltime" />}
      </div>
      {right}
    </div>
    {children}
  </div>
);

const Stat = ({ icon, label, value, sub, accent }) => (
  <Card accent={accent}>
    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "'DM Mono', monospace", letterSpacing: 0.8, textTransform: "uppercase" }}>{icon} {label}</div>
    <div style={{ fontSize: 24, fontWeight: 700, color: "#fff", fontFamily: "'Outfit', sans-serif", marginTop: 4 }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono', monospace", marginTop: 2 }}>{sub}</div>}
  </Card>
);

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "rgba(8,8,14,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "8px 12px", backdropFilter: "blur(20px)", maxWidth: 220 }}>
      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", marginBottom: 4, fontFamily: "'DM Mono', monospace" }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ fontSize: 12, color: p.color || "#fff", fontWeight: 500, lineHeight: 1.5 }}>
          {p.name}: {typeof p.value === "number" ? p.value.toLocaleString() : p.value}
        </div>
      ))}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════════
export default function TriPulse() {
  // Auth state
  const [token, setToken] = useState(null);
  const [athlete, setAthlete] = useState(null);
  const [activities, setActivities] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadMsg, setLoadMsg] = useState("");
  const [error, setError] = useState(null);
  const [demoMode, setDemoMode] = useState(false);

  // UI state
  const [view, setView] = useState("overview");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [volumeMetric, setVolumeMetric] = useState("distance");

  // Handle OAuth redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (code) {
      window.history.replaceState({}, "", window.location.pathname);
      setLoading(true);
      setLoadMsg("Authenticating with Strava…");
      exchangeToken(code).then(data => {
        if (data.access_token) {
          setToken(data.access_token);
          setAthlete(data.athlete);
          // Persist for refresh
          try {
            window.parent?.postMessage?.({ type: "strava_token", data }, "*");
          } catch(e) {}
        } else {
          setError("Auth failed — check your Client ID/Secret");
          setLoading(false);
        }
      }).catch(e => { setError(e.message); setLoading(false); });
    }
  }, []);

  // Fetch activities once we have a token
  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setLoadMsg("Fetching activities from Strava…");
    fetchAllActivities(token, count => setLoadMsg(`Loaded ${count} activities…`))
      .then(data => {
        setActivities(data);
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [token]);

  // Demo mode
  const handleDemo = () => {
    setDemoMode(true);
    setActivities(generateDemoData());
  };

  // Process data
  const processed = useMemo(() => activities ? processActivities(activities) : null, [activities]);

  useEffect(() => {
    if (processed?.years?.length) {
      setSelectedYear(processed.years[processed.years.length - 1]);
    }
  }, [processed?.years?.length]);

  const yearData = processed?.monthlyByYear?.[selectedYear] || [];
  const yearTotals = useMemo(() => {
    if (!yearData.length) return null;
    return yearData.reduce((t, m) => ({
      swimDist: t.swimDist + m.swimDist, bikeDist: t.bikeDist + m.bikeDist, runDist: t.runDist + m.runDist,
      swimTime: t.swimTime + m.swimTime, bikeTime: t.bikeTime + m.bikeTime, runTime: t.runTime + m.runTime,
      swimSessions: t.swimSessions + m.swimSessions, bikeSessions: t.bikeSessions + m.bikeSessions, runSessions: t.runSessions + m.runSessions,
      elevation: t.elevation + m.elevation, sufferScore: t.sufferScore + m.sufferScore,
    }), { swimDist: 0, bikeDist: 0, runDist: 0, swimTime: 0, bikeTime: 0, runTime: 0, swimSessions: 0, bikeSessions: 0, runSessions: 0, elevation: 0, sufferScore: 0 });
  }, [yearData]);

  // Volume chart data
  const volumeChart = yearData.map(m => ({
    month: m.month,
    Swim: volumeMetric === "distance" ? m.swimDist : m.swimTime,
    Bike: volumeMetric === "distance" ? m.bikeDist : m.bikeTime,
    Run: volumeMetric === "distance" ? m.runDist : m.runTime,
  }));

  // YoY comparison
  const yoyData = useMemo(() => {
    if (!processed) return [];
    const recentYears = processed.years.slice(-3);
    return MONTHS.map((label, m) => {
      const entry = { month: label };
      recentYears.forEach(y => {
        const md = processed.monthlyByYear[y]?.[m];
        if (md) entry[`${y}`] = +(md.swimDist + md.bikeDist + md.runDist).toFixed(0);
      });
      return entry;
    });
  }, [processed, selectedYear]);

  // Time split
  const timeSplit = yearTotals ? [
    { name: "Swim", value: +yearTotals.swimTime.toFixed(1), fill: SPORT.swim.color },
    { name: "Bike", value: +yearTotals.bikeTime.toFixed(1), fill: SPORT.bike.color },
    { name: "Run", value: +yearTotals.runTime.toFixed(1), fill: SPORT.run.color },
  ] : [];

  const navItems = [
    { key: "overview", label: "Overview", icon: "◬" },
    { key: "volume", label: "Volume", icon: "▤" },
    { key: "pace", label: "Pace", icon: "⚡" },
    { key: "races", label: "Races", icon: "🏁" },
  ];

  // ─── AUTH / LOADING SCREENS ────────────────────────────────────────────
  if (!activities && !loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#08080E", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Outfit', sans-serif" }}>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=DM+Mono:wght@300;400;500&display=swap" rel="stylesheet" />
        <div style={{ textAlign: "center", maxWidth: 400, padding: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>◬</div>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: "#fff", margin: "0 0 8px", letterSpacing: -1 }}>TriPulse</h1>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, marginBottom: 32, lineHeight: 1.6 }}>
            Your triathlon training analytics.<br />Connect Strava to analyze swim, bike & run data.
          </p>
          <a href={STRAVA_AUTH_URL} style={{
            display: "inline-flex", alignItems: "center", gap: 10, padding: "14px 28px",
            background: "#FC4C02", color: "#fff", borderRadius: 12, textDecoration: "none",
            fontSize: 15, fontWeight: 600, fontFamily: "'Outfit', sans-serif",
            boxShadow: "0 4px 24px rgba(252,76,2,0.3)", transition: "transform 0.15s",
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.599h4.172L10.463 0l-7 13.828h4.169" /></svg>
            Connect with Strava
          </a>
          <div style={{ marginTop: 24 }}>
            <button onClick={handleDemo} style={{
              background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)",
              padding: "10px 24px", borderRadius: 10, cursor: "pointer", fontSize: 13, fontFamily: "'Outfit', sans-serif",
            }}>
              Preview with demo data
            </button>
          </div>
          {error && <p style={{ color: "#EF4444", marginTop: 16, fontSize: 13 }}>{error}</p>}
          <div style={{ marginTop: 48, padding: 20, background: "rgba(255,255,255,0.03)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)", textAlign: "left" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.6)", marginBottom: 8 }}>Setup Guide</div>
            <ol style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, lineHeight: 1.8, margin: 0, paddingLeft: 18 }}>
              <li>Go to <span style={{ color: "#FC4C02" }}>strava.com/settings/api</span> and create an app</li>
              <li>Set Authorization Callback Domain to your hosting domain</li>
              <li>Replace <code style={{ color: "#00D4FF", background: "rgba(0,212,255,0.1)", padding: "1px 6px", borderRadius: 4 }}>YOUR_CLIENT_ID</code> and <code style={{ color: "#00D4FF", background: "rgba(0,212,255,0.1)", padding: "1px 6px", borderRadius: 4 }}>YOUR_CLIENT_SECRET</code> in the code</li>
              <li>Deploy as PWA and add to home screen</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#08080E", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Outfit', sans-serif" }}>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=DM+Mono:wght@300;400;500&display=swap" rel="stylesheet" />
        <div style={{ width: 48, height: 48, border: "3px solid rgba(255,255,255,0.1)", borderTopColor: "#00D4FF", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ color: "rgba(255,255,255,0.5)", marginTop: 20, fontSize: 14 }}>{loadMsg}</p>
      </div>
    );
  }

  if (!processed) return null;

  const recentYears = processed.years.slice(-3);

  // ─── MAIN DASHBOARD ────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "#08080E", color: "#fff", fontFamily: "'Outfit', -apple-system, sans-serif", paddingBottom: 80 }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=DM+Mono:wght@300;400;500&display=swap" rel="stylesheet" />

      {/* HEADER */}
      <div style={{
        borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "14px 20px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        position: "sticky", top: 0, zIndex: 100, background: "rgba(8,8,14,0.92)", backdropFilter: "blur(20px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: "linear-gradient(135deg, #00D4FF, #FF8C00, #00E676)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#08080E" }}>◬</div>
          <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: -0.5 }}>TriPulse</span>
          {demoMode && <span style={{ fontSize: 9, color: "#FF8C00", fontFamily: "'DM Mono', monospace", padding: "2px 6px", background: "rgba(255,140,0,0.1)", borderRadius: 4 }}>DEMO</span>}
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono', monospace" }}>
          {processed.triActivities.length} activities
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 16px" }}>

        {/* YEAR + NAV */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20, marginBottom: 8, flexWrap: "wrap", gap: 10 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>{selectedYear} Season</h1>
            {yearTotals && (
              <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, margin: "2px 0 0", fontFamily: "'DM Mono', monospace" }}>
                {yearTotals.swimSessions + yearTotals.bikeSessions + yearTotals.runSessions} sessions · {(yearTotals.swimTime + yearTotals.bikeTime + yearTotals.runTime).toFixed(0)}h · {(yearTotals.swimDist + yearTotals.bikeDist + yearTotals.runDist).toFixed(0)} km
              </p>
            )}
          </div>
          <Pill options={processed.years.map(y => ({ value: y, label: y }))} value={selectedYear} onChange={setSelectedYear} small />
        </div>

        {/* NAV TABS */}
        <div style={{ display: "flex", gap: 6, marginBottom: 20, overflowX: "auto" }}>
          {navItems.map(n => (
            <button key={n.key} onClick={() => setView(n.key)} style={{
              padding: "8px 16px", borderRadius: 10, border: "none", cursor: "pointer",
              fontSize: 13, fontWeight: 500, fontFamily: "'Outfit', sans-serif",
              background: view === n.key ? "rgba(255,255,255,0.1)" : "transparent",
              color: view === n.key ? "#fff" : "rgba(255,255,255,0.35)", transition: "all 0.2s",
              whiteSpace: "nowrap",
            }}>
              <span style={{ marginRight: 6 }}>{n.icon}</span>{n.label}
            </button>
          ))}
        </div>

        {/* ═══ OVERVIEW ═══ */}
        {view === "overview" && yearTotals && (<>
          {/* Stat cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
            <Stat icon="🏊" label="Swim" value={`${yearTotals.swimDist.toFixed(0)} km`} sub={`${yearTotals.swimTime.toFixed(0)}h · ${yearTotals.swimSessions} sessions`} accent={SPORT.swim.color} />
            <Stat icon="🚴" label="Bike" value={`${yearTotals.bikeDist.toLocaleString()} km`} sub={`${yearTotals.bikeTime.toFixed(0)}h · ${yearTotals.bikeSessions} sessions`} accent={SPORT.bike.color} />
            <Stat icon="🏃" label="Run" value={`${yearTotals.runDist.toFixed(0)} km`} sub={`${yearTotals.runTime.toFixed(0)}h · ${yearTotals.runSessions} sessions`} accent={SPORT.run.color} />
            <Stat icon="⛰" label="Elevation" value={`${yearTotals.elevation.toLocaleString()} m`} sub={`${yearTotals.sufferScore.toLocaleString()} suffer score`} accent="#A855F7" />
          </div>

          {/* Time split + zones side by side */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, marginTop: 16 }}>
            <Card>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: "rgba(255,255,255,0.6)" }}>Time by Discipline</div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={timeSplit} cx="50%" cy="50%" innerRadius={50} outerRadius={78} paddingAngle={3} dataKey="value" stroke="none">
                    {timeSplit.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Pie>
                  <Tooltip content={<Tip />} />
                  <Legend formatter={v => <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </Card>
            <Card>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: "rgba(255,255,255,0.6)" }}>HR Zone Distribution <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.6, padding: "1px 6px", borderRadius: 5, background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono', monospace", textTransform: "uppercase" }}>All-time</span></div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 6 }}>
                {processed.zoneData.map((z, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 80, fontSize: 10, color: "rgba(255,255,255,0.45)", fontFamily: "'DM Mono', monospace", flexShrink: 0 }}>{z.zone}</div>
                    <div style={{ flex: 1, height: 18, background: "rgba(255,255,255,0.04)", borderRadius: 5, overflow: "hidden" }}>
                      <div style={{ width: `${z.pct}%`, height: "100%", background: ZONE_COLORS[i], borderRadius: 5, transition: "width 0.6s ease" }} />
                    </div>
                    <div style={{ width: 30, fontSize: 11, color: "rgba(255,255,255,0.5)", fontFamily: "'DM Mono', monospace", textAlign: "right" }}>{z.pct}%</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Weekly training */}
          <Section title="Weekly Training Hours (Last 12 Weeks)" scope="rolling">
            <Card>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={processed.weeklyData}>
                  <defs>
                    {Object.entries(SPORT).map(([k, s]) => (
                      <linearGradient key={k} id={`${k}G`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={s.color} stopOpacity={0.25} />
                        <stop offset="100%" stopColor={s.color} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="week" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10, fontFamily: "DM Mono" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10, fontFamily: "DM Mono" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<Tip />} />
                  <Area type="monotone" dataKey="swim" name="Swim" stroke={SPORT.swim.color} fill="url(#swimG)" strokeWidth={2} />
                  <Area type="monotone" dataKey="bike" name="Bike" stroke={SPORT.bike.color} fill="url(#bikeG)" strokeWidth={2} />
                  <Area type="monotone" dataKey="run" name="Run" stroke={SPORT.run.color} fill="url(#runG)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          </Section>

          {/* Recent races preview */}
          {processed.races.filter(r => r.type !== "Brick").length > 0 && (
            <Section title="Recent Races" scope="alltime" right={<button onClick={() => setView("races")} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 12, fontFamily: "'Outfit', sans-serif" }}>View all →</button>}>
              <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
                {processed.races.filter(r => r.type !== "Brick").slice(0, 4).map((r, i) => (
                  <Card key={i} style={{ minWidth: 220, flex: "0 0 auto" }}>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono', monospace" }}>{r.date}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4, marginBottom: 8, lineHeight: 1.3 }}>{r.name}</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "rgba(168,85,247,0.12)", color: "#A855F7" }}>{r.type}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{fmtDuration(r.totalTime)}</span>
                    </div>
                    <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
                      {r.sports.map(s => (
                        <div key={s} style={{ fontSize: 10, color: SPORT[s].color, fontFamily: "'DM Mono', monospace" }}>
                          {SPORT[s].icon} {fmtDuration(r.legs[s]?.elapsed_time || r.legs[s]?.moving_time)}
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            </Section>
          )}
        </>)}

        {/* ═══ VOLUME ═══ */}
        {view === "volume" && (<>
          <Section title="Monthly Volume" scope="season" right={
            <Pill options={[{ value: "distance", label: "Distance (km)" }, { value: "time", label: "Hours" }]} value={volumeMetric} onChange={setVolumeMetric} />
          }>
            <Card>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={volumeChart} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11, fontFamily: "DM Mono" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 11, fontFamily: "DM Mono" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<Tip />} />
                  <Bar dataKey="Swim" fill={SPORT.swim.color} radius={[4,4,0,0]} opacity={0.85} />
                  <Bar dataKey="Bike" fill={SPORT.bike.color} radius={[4,4,0,0]} opacity={0.85} />
                  <Bar dataKey="Run" fill={SPORT.run.color} radius={[4,4,0,0]} opacity={0.85} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Section>

          <Section title="Year-over-Year Total Volume (km)" scope="alltime">
            <Card>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={yoyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11, fontFamily: "DM Mono" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 11, fontFamily: "DM Mono" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<Tip />} />
                  {recentYears.map((y, i) => (
                    <Line key={y} type="monotone" dataKey={`${y}`} stroke={`rgba(255,255,255,${0.25 + i * 0.3})`} strokeWidth={1.5 + i * 0.5} dot={false} strokeDasharray={i === recentYears.length - 1 ? undefined : "5 3"} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 8 }}>
                {recentYears.map((y, i) => (
                  <div key={y} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: `rgba(255,255,255,${0.25 + i * 0.3})` }}>
                    <div style={{ width: 14, height: 2, background: `rgba(255,255,255,${0.25 + i * 0.3})` }} />{y}
                  </div>
                ))}
              </div>
            </Card>
          </Section>

          {/* Monthly sessions breakdown */}
          <Section title="Monthly Session Count" scope="season">
            <Card>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={yearData.map(m => ({ month: m.month, Swim: m.swimSessions, Bike: m.bikeSessions, Run: m.runSessions }))} barGap={1}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10, fontFamily: "DM Mono" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10, fontFamily: "DM Mono" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<Tip />} />
                  <Bar dataKey="Swim" fill={SPORT.swim.color} radius={[3,3,0,0]} opacity={0.7} />
                  <Bar dataKey="Bike" fill={SPORT.bike.color} radius={[3,3,0,0]} opacity={0.7} />
                  <Bar dataKey="Run" fill={SPORT.run.color} radius={[3,3,0,0]} opacity={0.7} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Section>

          {/* Monthly elevation */}
          <Section title="Monthly Elevation Gain (m)" scope="season">
            <Card>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={yearData.map(m => ({ month: m.month, elevation: m.elevation }))}>
                  <defs>
                    <linearGradient id="elevG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#A855F7" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#A855F7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10, fontFamily: "DM Mono" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10, fontFamily: "DM Mono" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<Tip />} />
                  <Area type="monotone" dataKey="elevation" stroke="#A855F7" fill="url(#elevG)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          </Section>
        </>)}

        {/* ═══ PACE ═══ */}
        {view === "pace" && (<>
          <Section title="Pace & Speed Trends" scope="rolling">
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
              {[
                { key: "swimPace", label: "Swim Pace (min/100m)", color: SPORT.swim.color, reversed: true },
                { key: "bikeSpeed", label: "Bike Speed (km/h)", color: SPORT.bike.color, reversed: false },
                { key: "runPace", label: "Run Pace (min/km)", color: SPORT.run.color, reversed: true },
              ].map(s => (
                <Card key={s.key}>
                  <div style={{ fontSize: 13, color: s.color, fontWeight: 600, marginBottom: 8 }}>{s.label}</div>
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={processed.paceByWeek}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="week" tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 9, fontFamily: "DM Mono" }} axisLine={false} tickLine={false} interval={3} />
                      <YAxis domain={["auto", "auto"]} reversed={s.reversed} tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10, fontFamily: "DM Mono" }} axisLine={false} tickLine={false} width={38} />
                      <Tooltip content={<Tip />} />
                      <Line type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2.5} dot={{ r: 2.5, fill: s.color }} connectNulls activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </Card>
              ))}
            </div>
          </Section>

          {/* Personal bests */}
          <Section title="Personal Bests" scope="alltime">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
              {Object.entries(processed.pbs).map(([sport, { fastest, longest }]) => (
                <Card key={sport} accent={SPORT[sport].color}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: SPORT[sport].color, marginBottom: 10 }}>{SPORT[sport].icon} {SPORT[sport].label}</div>
                  {fastest && (
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono', monospace" }}>Fastest Avg</div>
                      <div style={{ fontSize: 18, fontWeight: 700 }}>{fmtPace(fastest.average_speed, sport)}</div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", fontFamily: "'DM Mono', monospace" }}>
                        {(fastest.distance / 1000).toFixed(1)} km · {new Date(fastest.start_date_local || fastest.start_date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                      </div>
                    </div>
                  )}
                  {longest && (
                    <div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono', monospace" }}>Longest</div>
                      <div style={{ fontSize: 18, fontWeight: 700 }}>{(longest.distance / 1000).toFixed(1)} km</div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", fontFamily: "'DM Mono', monospace" }}>
                        {fmtDuration(longest.moving_time)} · {new Date(longest.start_date_local || longest.start_date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </Section>
        </>)}

        {/* ═══ RACES ═══ */}
        {view === "races" && (() => {
          const confirmedRaces = processed.races.filter(r => r.type !== "Brick");
          const bricks = processed.races.filter(r => r.type === "Brick");
          const roadRaces = processed.roadRaces || [];
          return (<>
            <Section title={`Race History (${confirmedRaces.length})`}>
              {confirmedRaces.length === 0 ? (
                <Card><p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, margin: 0 }}>No races detected yet. Races are matched from the built-in database or identified by race keywords in your Strava activity names (e.g. "Ironman", "70.3", "race").</p></Card>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {confirmedRaces.map((r, i) => {
                    const sc = SERIES_COLORS[r.series] || SERIES_COLORS.Independent;
                    return (
                      <Card key={i} style={{ padding: "16px 20px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono', monospace", marginBottom: 4 }}>
                              {r.date}{r.location ? ` · ${r.location}` : ""}
                            </div>
                            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, lineHeight: 1.3 }}>{r.name}</div>
                            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                              {r.series && r.series !== "Independent" && (
                                <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: sc.bg, color: sc.text, fontWeight: 700 }}>{r.series}</span>
                              )}
                              <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.55)", fontWeight: 600 }}>{r.type}</span>
                              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono', monospace" }}>
                                {(r.totalDist / 1000).toFixed(1)} km
                              </span>
                              {r.knownRef && (
                                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", fontFamily: "'DM Mono', monospace" }}>verified</span>
                              )}
                            </div>
                          </div>
                          <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "'DM Mono', monospace", color: "#fff", flexShrink: 0 }}>
                            {fmtDuration(r.totalTime)}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
                          {r.sports.map(s => {
                            const leg = r.legs[s];
                            if (!leg) return null;
                            return (
                              <div key={s} style={{ flex: 1, minWidth: 100, padding: "10px 12px", background: SPORT[s].dim, borderRadius: 10, border: `1px solid ${SPORT[s].color}22` }}>
                                <div style={{ fontSize: 11, color: SPORT[s].color, fontWeight: 600, marginBottom: 4 }}>{SPORT[s].icon} {SPORT[s].label}</div>
                                <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{fmtDuration(leg.elapsed_time || leg.moving_time)}</div>
                                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono', monospace", marginTop: 2 }}>
                                  {(leg.distance / 1000).toFixed(1)} km · {fmtPace(leg.average_speed, s)}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </Section>

            {bricks.length > 0 && (
              <Section title={`Brick Workouts (${bricks.length})`}>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginBottom: 10, fontFamily: "'DM Mono', monospace" }}>
                  Same-day multi-sport sessions without race keywords — not counted as races
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {bricks.map((r, i) => (
                    <Card key={i} style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                        <div>
                          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono', monospace" }}>{r.date}</div>
                          <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{r.name}</div>
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          {r.sports.map(s => (
                            <span key={s} style={{ fontSize: 10, color: SPORT[s].color, fontFamily: "'DM Mono', monospace" }}>
                              {SPORT[s].icon} {fmtDuration(r.legs[s]?.moving_time)}
                            </span>
                          ))}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </Section>
            )}

            {roadRaces.length > 0 && (
              <Section title={`Road Races (${roadRaces.length})`} scope="alltime">
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {roadRaces.map((r, i) => {
                    const sc = SERIES_COLORS[r.series] || SERIES_COLORS.Independent;
                    const pace = r.activity?.average_speed;
                    return (
                      <Card key={i} style={{ padding: "16px 20px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono', monospace", marginBottom: 4 }}>
                              {r.date}{r.location ? ` · ${r.location}` : ""}
                            </div>
                            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, lineHeight: 1.3 }}>{r.name}</div>
                            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                              {r.series && r.series !== "Independent" && (
                                <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: sc.bg, color: sc.text, fontWeight: 700 }}>{r.series}</span>
                              )}
                              <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: SPORT.run.dim, color: SPORT.run.color, fontWeight: 600 }}>{r.type}</span>
                              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono', monospace" }}>
                                {(r.totalDist / 1000).toFixed(1)} km
                              </span>
                              {r.knownRef && <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", fontFamily: "'DM Mono', monospace" }}>verified</span>}
                            </div>
                          </div>
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "'DM Mono', monospace", color: "#fff" }}>{fmtDuration(r.totalTime)}</div>
                            {pace && <div style={{ fontSize: 11, color: SPORT.run.color, fontFamily: "'DM Mono', monospace", marginTop: 2 }}>{fmtPace(pace, "run")}</div>}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </Section>
            )}

            <Section title="How Race Identification Works">
              <Card style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.7 }}>
                <p style={{ margin: "0 0 12px" }}>TriPulse uses a two-layer approach to identify real races vs training bricks:</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <span style={{ color: "#FC4C02", fontWeight: 700, flexShrink: 0 }}>1.</span>
                    <span><strong style={{ color: "rgba(255,255,255,0.7)" }}>Known race database</strong> — A built-in list of {KNOWN_RACES.length}+ real events (Ironman, Challenge, local races). Activities are matched by name keywords + distance, and get the official race name, series, and location.</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <span style={{ color: "#FF8C00", fontWeight: 700, flexShrink: 0 }}>2.</span>
                    <span><strong style={{ color: "rgba(255,255,255,0.7)" }}>Keyword fallback</strong> — Same-day multi-sport activities containing race keywords ("race", "ironman", "70.3", etc.) are flagged as races even if not in the database.</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <span style={{ color: "#00E676", fontWeight: 700, flexShrink: 0 }}>3.</span>
                    <span><strong style={{ color: "rgba(255,255,255,0.7)" }}>Brick separation</strong> — Multi-sport days without race keywords are shown separately as Brick Workouts, not counted in race history.</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <span style={{ color: "#A855F7", fontWeight: 700, flexShrink: 0 }}>4.</span>
                    <span><strong style={{ color: "rgba(255,255,255,0.7)" }}>Road races</strong> — Standalone runs in the 20–23km (half) or 41.5–44.5km (full) range are matched to {KNOWN_ROAD_RACES.length}+ known marathons using GPS start location (within {LOCATION_MATCH_KM}km), then name keywords as fallback.</span>
                  </div>
                </div>
                <p style={{ margin: "12px 0 0", fontSize: 11, color: "rgba(255,255,255,0.25)" }}>
                  Tip: For triathlons not in the database, name your Strava activity with the race name (e.g. "Ironman 70.3 Santa Cruz - Bike"). For road races, GPS matching works automatically on real Strava data.
                </p>
              </Card>
            </Section>
          </>);
        })()}

      </div>

      {/* FOOTER */}
      <div style={{ textAlign: "center", marginTop: 40, padding: "20px 16px" }}>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.12)", fontFamily: "'DM Mono', monospace" }}>
          TRIPULSE · POWERED BY STRAVA API · {new Date().getFullYear()}
        </span>
      </div>
    </div>
  );
}
