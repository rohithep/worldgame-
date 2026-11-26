"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CountryFlag } from "@/components/ui/flag";
import { cn } from "@/lib/utils";

export interface CountryCount {
  countryCode: string;
  countryName: string;
  playerCount: number;
}

type ContinentId =
  | "north-america"
  | "south-america"
  | "europe"
  | "africa"
  | "asia"
  | "oceania";

interface ContinentSpec {
  id: ContinentId;
  name: string;
  labelPos: { x: number; y: number };
  paths: string[];
  codes: Set<string>;
}

const CONTINENTS: ContinentSpec[] = [
  {
    id: "north-america",
    name: "North America",
    labelPos: { x: 20, y: 34 },
    paths: [
      "M72,96 L112,72 L162,64 L218,74 L264,96 L292,126 L278,154 L254,164 L236,186 L216,204 L210,226 L196,232 L182,216 L168,204 L162,222 L176,242 L198,258 L216,274 L210,282 L188,266 L162,248 L142,226 L124,196 L112,164 L96,136 L74,116 Z",
      "M314,42 L364,34 L392,52 L378,86 L342,102 L318,84 L306,62 Z",
      "M232,228 L254,232 L250,239 L228,235 Z",
    ],
    codes: new Set([
      "US", "CA", "MX", "GT", "BZ", "HN", "SV", "NI", "CR", "PA", "CU", "JM",
      "HT", "DO", "BS", "BB", "TT", "LC", "GD", "VC", "AG", "DM", "KN",
    ]),
  },
  {
    id: "south-america",
    name: "South America",
    labelPos: { x: 29, y: 71 },
    paths: [
      "M222,282 L256,276 L292,294 L328,318 L342,344 L334,376 L312,404 L288,432 L272,462 L256,474 L244,458 L242,424 L236,386 L224,352 L212,322 L214,296 Z",
    ],
    codes: new Set([
      "BR", "AR", "CO", "PE", "VE", "CL", "EC", "BO", "PY", "UY", "GY", "SR",
    ]),
  },
  {
    id: "europe",
    name: "Europe",
    labelPos: { x: 51, y: 26 },
    paths: [
      "M444,166 L456,144 L478,136 L496,122 L494,94 L516,74 L544,72 L554,94 L538,116 L556,118 L578,114 L594,132 L584,158 L566,174 L544,182 L528,194 L514,180 L506,192 L496,176 L478,180 L458,188 L442,182 Z",
      "M448,124 L460,116 L466,134 L452,140 Z M436,128 L444,126 L444,136 L436,136 Z",
      "M408,82 L428,78 L432,88 L412,92 Z",
    ],
    codes: new Set([
      "GB", "FR", "DE", "IT", "ES", "PL", "RO", "NL", "BE", "CZ", "GR", "PT",
      "SE", "HU", "AT", "BY", "CH", "BG", "RS", "DK", "FI", "SK", "NO", "IE",
      "HR", "MD", "BA", "AL", "LT", "MK", "SI", "LV", "EE", "ME", "LU", "MT",
      "IS", "AD", "LI", "MC", "SM", "VA", "UA",
    ]),
  },
  {
    id: "africa",
    name: "Africa",
    labelPos: { x: 52, y: 58 },
    paths: [
      "M442,210 L476,196 L524,198 L562,210 L584,238 L606,274 L616,294 L596,326 L584,364 L564,404 L538,426 L516,422 L502,386 L492,344 L474,316 L444,306 L422,282 L418,246 L428,224 Z",
      "M604,368 L616,362 L620,394 L608,402 Z",
    ],
    codes: new Set([
      "NG", "ET", "EG", "CD", "TZ", "ZA", "KE", "UG", "SD", "DZ", "MA", "AO",
      "MZ", "GH", "MG", "CM", "CI", "NE", "BF", "ML", "MW", "ZM", "TD", "SO",
      "SN", "ZW", "GN", "RW", "BJ", "BI", "TN", "SS", "TG", "SL", "LY", "CG",
      "LR", "CF", "MR", "ER", "NA", "GM", "BW", "GA", "LS", "GW", "GQ", "MU",
      "SZ", "DJ", "KM", "CV", "ST", "SC",
    ]),
  },
  {
    id: "asia",
    name: "Asia",
    labelPos: { x: 73, y: 36 },
    paths: [
      "M586,92 L646,74 L732,74 L818,86 L878,108 L866,138 L832,162 L818,196 L794,228 L768,248 L754,274 L738,266 L730,242 L708,244 L692,286 L678,292 L664,254 L642,238 L618,248 L596,232 L582,208 L596,184 L582,158 L592,130 Z",
      "M844,174 L858,168 L864,192 L848,208 L838,198 Z",
      "M692,298 L698,298 L696,308 L690,306 Z",
      "M802,258 L814,256 L818,278 L806,282 Z",
      "M742,298 L776,308 L774,316 L738,308 Z M786,312 L818,314 L816,324 L784,320 Z M778,284 L798,282 L802,300 L782,302 Z",
    ],
    codes: new Set([
      "IN", "CN", "ID", "PK", "BD", "JP", "PH", "VN", "IR", "TR", "TH", "MM",
      "KR", "IQ", "AF", "SA", "UZ", "MY", "YE", "NP", "KP", "SY", "LK", "KZ",
      "KH", "JO", "AZ", "AE", "TJ", "IL", "LA", "LB", "KG", "TM", "SG", "OM",
      "PS", "KW", "GE", "MN", "AM", "QA", "BH", "TL", "CY", "BT", "MV", "BN",
      "RU",
    ]),
  },
  {
    id: "oceania",
    name: "Oceania",
    labelPos: { x: 83, y: 78 },
    paths: [
      "M776,356 L814,344 L856,352 L884,378 L882,416 L856,438 L818,434 L784,418 L768,388 Z",
      "M828,312 L862,318 L860,330 L826,324 Z",
      "M914,424 L928,416 L934,434 L918,444 Z M904,446 L916,442 L912,458 L898,460 Z",
    ],
    codes: new Set([
      "AU", "PG", "NZ", "FJ", "SB", "VU", "WS", "KI", "FM", "TO", "MH", "PW",
      "NR", "TV",
    ]),
  },
];

export function WorldMap({ countryCounts }: { countryCounts: CountryCount[] }) {
  const [hoveredId, setHoveredId] = useState<ContinentId | null>(null);

  const continentStats = useMemo(() => {
    const byCode = new Map(countryCounts.map((c) => [c.countryCode.toUpperCase(), c]));

    const computed = CONTINENTS.map((continent) => {
      let total = 0;
      const countries: CountryCount[] = [];
      for (const code of continent.codes) {
        const match = byCode.get(code);
        if (match && match.playerCount > 0) {
          total += match.playerCount;
          countries.push(match);
        }
      }
      countries.sort((a, b) => b.playerCount - a.playerCount);
      return {
        ...continent,
        playerCount: total,
        countries,
      };
    });

    const maxCount = Math.max(1, ...computed.map((c) => c.playerCount));
    return { computed, maxCount };
  }, [countryCounts]);

  const topCountries = useMemo(
    () => [...countryCounts].sort((a, b) => b.playerCount - a.playerCount).slice(0, 10),
    [countryCounts]
  );

  const activeContinent = continentStats.computed.find((c) => c.id === hoveredId) || null;

  return (
    <div className="space-y-6">
      {/* Dark Cinema Mission-Control World Map */}
      <div className="relative overflow-hidden rounded-[26px] border border-white/10 bg-gradient-to-b from-[#0A0F1A] via-[#070B13] to-[#05080F] p-3 shadow-[inset_0_1px_0_rgba(255,235,200,0.12),0_20px_50px_-20px_rgba(0,0,0,0.9)] sm:p-6">
        <div className="relative aspect-[2/1] w-full">
          <svg
            viewBox="0 0 1000 500"
            role="img"
            aria-label="World map showing aggregate player counts by continent"
            className="h-full w-full select-none"
          >
            <defs>
              <linearGradient id="cinemaActive" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#F6C878" />
                <stop offset="100%" stopColor="#C97D24" />
              </linearGradient>
              <linearGradient id="cinemaIdle" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1D273A" />
                <stop offset="100%" stopColor="#121927" />
              </linearGradient>
              <filter id="amberGlow" x="-15%" y="-15%" width="130%" height="130%">
                <feDropShadow dx="0" dy="0" stdDeviation="8" floodColor="#E8A849" floodOpacity="0.45" />
              </filter>
            </defs>

            {/* Telemetry latitude/longitude grid */}
            <g stroke="#5AA9E6" strokeOpacity="0.14" strokeWidth="1" strokeDasharray="3 6">
              <line x1="20" y1="125" x2="980" y2="125" />
              <line x1="20" y1="250" x2="980" y2="250" />
              <line x1="20" y1="375" x2="980" y2="375" />
              <line x1="250" y1="20" x2="250" y2="480" />
              <line x1="500" y1="20" x2="500" y2="480" />
              <line x1="750" y1="20" x2="750" y2="480" />
            </g>

            {continentStats.computed.map((continent) => {
              const hasPlayers = continent.playerCount > 0;
              const isHovered = hoveredId === continent.id;
              const ratio = continent.playerCount / continentStats.maxCount;
              const fillOpacity = hasPlayers ? 0.65 + ratio * 0.35 : isHovered ? 0.95 : 0.85;

              return (
                <g
                  key={continent.id}
                  onMouseEnter={() => setHoveredId(continent.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() =>
                    setHoveredId((prev) => (prev === continent.id ? null : continent.id))
                  }
                  className="cursor-pointer transition-opacity duration-200"
                >
                  {continent.paths.map((d, idx) => (
                    <path
                      key={idx}
                      d={d}
                      fill={hasPlayers ? "url(#cinemaActive)" : "url(#cinemaIdle)"}
                      fillOpacity={fillOpacity}
                      stroke={isHovered ? "#F6C878" : hasPlayers ? "#FCE3A6" : "#2D3B54"}
                      strokeWidth={isHovered ? 2 : 1.2}
                      strokeLinejoin="round"
                      className="transition-all duration-300"
                    />
                  ))}
                  <title>
                    {continent.name}: {continent.playerCount.toLocaleString("en-US")} player
                    {continent.playerCount === 1 ? "" : "s"}
                  </title>
                </g>
              );
            })}
          </svg>

          {/* Floating Smoked Glass Continent Badges */}
          {continentStats.computed.map((continent) => {
            const hasPlayers = continent.playerCount > 0;
            const isHovered = hoveredId === continent.id;
            return (
              <motion.button
                key={continent.id}
                type="button"
                onMouseEnter={() => setHoveredId(continent.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() =>
                  setHoveredId((prev) => (prev === continent.id ? null : continent.id))
                }
                animate={{ scale: isHovered ? 1.07 : 1 }}
                transition={{ type: "spring", stiffness: 360, damping: 26 }}
                style={{
                  left: `${continent.labelPos.x}%`,
                  top: `${continent.labelPos.y}%`,
                }}
                className={cn(
                  "absolute -translate-x-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium backdrop-blur-md transition-shadow",
                  hasPlayers
                    ? "border-[#E8A849]/50 bg-[#0B101C]/88 text-[#F4F1EA] shadow-[0_8px_24px_-4px_rgba(232,168,73,0.4)]"
                    : "border-white/12 bg-[#0B101C]/75 text-[#9AA3B2] shadow-[0_4px_14px_rgba(0,0,0,0.5)]"
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 shrink-0 rounded-full",
                    hasPlayers
                      ? "bg-[#F6C878] shadow-[0_0_8px_#E8A849]"
                      : "bg-[#4A5568]"
                  )}
                />
                <span className="hidden sm:inline">{continent.name}</span>
                <span className="sm:hidden">
                  {continent.name === "North America"
                    ? "N. America"
                    : continent.name === "South America"
                      ? "S. America"
                      : continent.name}
                </span>
                <span
                  className={cn(
                    "font-score rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold",
                    hasPlayers
                      ? "bg-[#E8A849]/20 text-[#FCE3A6]"
                      : "bg-white/[0.06] text-[#9AA3B2]"
                  )}
                >
                  {continent.playerCount.toLocaleString("en-US")}
                </span>
              </motion.button>
            );
          })}
        </div>

        {/* Interactive hovered/selected continent detail bar */}
        {activeContinent && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs backdrop-blur-md">
            <span className="font-semibold text-[#F4F1EA]">
              {activeContinent.name}:{" "}
              <span className="font-score text-[#E8A849]">
                {activeContinent.playerCount.toLocaleString("en-US")}
              </span>{" "}
              player{activeContinent.playerCount === 1 ? "" : "s"}
            </span>
            {activeContinent.countries.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                {activeContinent.countries.slice(0, 5).map((c) => (
                  <span
                    key={c.countryCode}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-0.5 font-medium text-[#F4F1EA]"
                  >
                    <CountryFlag code={c.countryCode} label={c.countryName} className="h-3 w-4.5" />
                    <span>{c.countryName}</span>
                    <span className="font-score text-[#E8A849]">{c.playerCount}</span>
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-[#9AA3B2]">
                Be the first player from {activeContinent.name}.
              </span>
            )}
          </div>
        )}
      </div>

      {/* 6-Continent Telemetry Strip */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        {continentStats.computed.map((c) => {
          const hasPlayers = c.playerCount > 0;
          return (
            <button
              key={c.id}
              type="button"
              onMouseEnter={() => setHoveredId(c.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => setHoveredId((prev) => (prev === c.id ? null : c.id))}
              className={cn(
                "flex flex-col items-start rounded-2xl border px-3.5 py-3 text-left transition-all",
                hoveredId === c.id
                  ? "border-[#E8A849]/50 bg-white/[0.07]"
                  : "border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06]"
              )}
            >
              <span className="text-[11px] font-medium tracking-wide text-[#9AA3B2]">
                {c.name}
              </span>
              <span
                className={cn(
                  "font-score mt-1 text-lg font-semibold",
                  hasPlayers ? "text-[#E8A849]" : "text-[#F4F1EA]/30"
                )}
              >
                {c.playerCount.toLocaleString("en-US")}
              </span>
            </button>
          );
        })}
      </div>

      {/* Top Countries Pills */}
      {topCountries.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2">
          {topCountries.map((c) => (
            <div
              key={c.countryCode}
              className="apple-glass-pill inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium text-[#F4F1EA]"
            >
              <CountryFlag code={c.countryCode} label={c.countryName} className="h-3.5 w-5" />
              <span>{c.countryName}</span>
              <span className="font-score font-semibold text-[#E8A849]">
                {c.playerCount.toLocaleString("en-US")}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
