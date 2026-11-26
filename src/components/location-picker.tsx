"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { CountryFlag } from "@/components/ui/flag";
import { Input } from "@/components/ui/input";
import { fetchCachedJson } from "@/lib/fetch-client";
import { cn } from "@/lib/utils";

interface CountryOption {
  code: string;
  name: string;
}

interface GeoChunk {
  code: string;
  name: string;
  stateLabel: string;
  districtLabel: string;
  states: { name: string; districts: string[] }[];
}

export interface LocationValue {
  countryCode: string;
  countryName: string;
  stateName: string;
  districtName: string;
  stateSource: "list" | "custom" | "none";
  districtSource: "list" | "custom" | "none";
}

interface SearchableSelectProps {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  options: { value: string; label: string; flagCode?: string }[];
  onSelect: (value: string, label: string) => void;
  allowOther?: boolean;
  isOtherSelected?: boolean;
  onSelectOther?: () => void;
  disabled?: boolean;
}

function SearchableSelect({
  id,
  label,
  placeholder,
  value,
  options,
  onSelect,
  allowOther,
  isOtherSelected,
  onSelectOther,
  disabled,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const selectedOption = options.find((o) => o.value === value);

  return (
    <div ref={containerRef} className="relative">
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-semibold text-[#0B1220]"
      >
        {label}
      </label>
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex min-h-12 w-full items-center justify-between gap-2 rounded-2xl border border-white/12 bg-white/[0.05] px-4 py-2.5 text-left text-base text-[#F4F1EA] backdrop-blur-md transition-colors hover:border-white/25 disabled:cursor-not-allowed disabled:opacity-50",
          open && "border-[#E8A849]/70 ring-2 ring-[#E8A849]/20"
        )}
      >
        <span className="flex items-center gap-2.5 truncate">
          {selectedOption?.flagCode && (
            <CountryFlag code={selectedOption.flagCode} label={selectedOption.label} />
          )}
          <span className={cn(!selectedOption && !isOtherSelected && "text-[#6B7689]")}>
            {isOtherSelected
              ? "Other (type your own)"
              : selectedOption
                ? selectedOption.label
                : placeholder}
          </span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-[#9AA3B2]" aria-hidden="true" />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute z-40 mt-2 w-full overflow-hidden rounded-2xl border border-white/15 bg-[#0C121E]/95 backdrop-blur-xl shadow-[0_24px_60px_-12px_rgba(0,0,0,0.85)]"
        >
          <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
            <Search className="h-4 w-4 text-[#9AA3B2]" aria-hidden="true" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${label.toLowerCase()}...`}
              aria-label={`Search ${label}`}
              autoFocus
              className="w-full bg-transparent py-1 text-sm text-[#F4F1EA] placeholder:text-[#6B7689] focus:outline-none"
            />
          </div>
          <div className="max-h-60 overflow-y-auto p-1.5">
            {filtered.map((opt) => {
              const active = !isOtherSelected && opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onSelect(opt.value, opt.label);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={cn(
                    "flex min-h-10 w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors",
                    active
                      ? "bg-[#E8A849]/15 font-semibold text-[#FCE3A6]"
                      : "text-[#F4F1EA] hover:bg-white/[0.07]"
                  )}
                >
                  <span className="flex items-center gap-2.5 truncate">
                    {opt.flagCode && <CountryFlag code={opt.flagCode} label={opt.label} />}
                    <span className="truncate">{opt.label}</span>
                  </span>
                  {active && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
                </button>
              );
            })}

            {filtered.length === 0 && (
              <p className="px-3 py-3 text-center text-sm text-[#5B6475]">
                No matches found.
              </p>
            )}

            {allowOther && onSelectOther && (
              <button
                type="button"
                role="option"
                aria-selected={Boolean(isOtherSelected)}
                onClick={() => {
                  onSelectOther();
                  setOpen(false);
                  setQuery("");
                }}
                className={cn(
                  "mt-1 flex min-h-10 w-full items-center justify-between rounded-xl border-t border-[#E6EAF2] px-3 py-2 text-left text-sm font-medium",
                  isOtherSelected
                    ? "bg-[#2F6BFF]/10 text-[#2F6BFF]"
                    : "text-[#2F6BFF] hover:bg-[#F4F7FC]"
                )}
              >
                <span>Other (type your own)</span>
                {isOtherSelected && <Check className="h-4 w-4" aria-hidden="true" />}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface LocationPickerProps {
  value: LocationValue;
  onChange: (next: LocationValue) => void;
}

export function LocationPicker({ value, onChange }: LocationPickerProps) {
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [loadedChunk, setLoadedChunk] = useState<GeoChunk | null>(null);
  const [loadingCode, setLoadingCode] = useState<string | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  const chunk =
    value.countryCode && loadedChunk?.code === value.countryCode
      ? loadedChunk
      : null;
  const loadingChunk = Boolean(value.countryCode && loadingCode === value.countryCode);

  // Load country index once (in-memory cached for 0ms repeat opens)
  useEffect(() => {
    let active = true;
    fetchCachedJson<CountryOption[]>("/data/geo/countries.json").then((res) => {
      if (!active) return;
      if (res.ok && res.data) {
        setCountries(res.data);
        setGeoError(null);
      } else {
        setGeoError(res.error || "Could not load country list.");
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // Lazily load selected country's static JSON chunk (cached per country)
  useEffect(() => {
    const code = value.countryCode;
    if (!code) return;
    let active = true;
    const t = setTimeout(() => {
      if (active) setLoadingCode(code);
    }, 0);
    fetchCachedJson<GeoChunk>(`/data/geo/${code.toUpperCase()}.json`).then((res) => {
      if (!active) return;
      if (res.ok && res.data) {
        setLoadedChunk(res.data);
      } else {
        setLoadedChunk(null);
      }
      setLoadingCode(null);
    });
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [value.countryCode]);

  const countryOptions = useMemo(
    () =>
      countries.map((c) => ({
        value: c.code,
        label: c.name,
        flagCode: c.code,
      })),
    [countries]
  );

  const stateOptions = useMemo(
    () =>
      (chunk?.states || []).map((s) => ({
        value: s.name,
        label: s.name,
      })),
    [chunk]
  );

  const selectedStateObj = useMemo(
    () => chunk?.states.find((s) => s.name === value.stateName) || null,
    [chunk, value.stateName]
  );

  const districtOptions = useMemo(
    () =>
      (selectedStateObj?.districts || []).map((d) => ({
        value: d,
        label: d,
      })),
    [selectedStateObj]
  );

  const hasStates = stateOptions.length > 0;
  const hasDistricts = districtOptions.length > 0;

  return (
    <div className="space-y-4">
      {geoError && (
        <p role="alert" className="text-xs font-medium text-[#FF7A8A]">
          {geoError}
        </p>
      )}
      <SearchableSelect
        id="country-select"
        label="Country (shown publicly on leaderboards)"
        placeholder="Select your country"
        value={value.countryCode}
        options={countryOptions}
        onSelect={(code, name) =>
          onChange({
            countryCode: code,
            countryName: name,
            stateName: "",
            districtName: "",
            stateSource: "list",
            districtSource: "list",
          })
        }
      />

      {value.countryCode && (
        <>
          {loadingChunk ? (
            <p className="text-sm text-[#5B6475]">Loading regions...</p>
          ) : hasStates ? (
            <div className="space-y-2.5">
              <SearchableSelect
                id="state-select"
                label={`${chunk?.stateLabel || "State / Province"} (private)`}
                placeholder={`Select ${(chunk?.stateLabel || "state").toLowerCase()}`}
                value={value.stateSource === "list" ? value.stateName : ""}
                options={stateOptions}
                allowOther
                isOtherSelected={value.stateSource === "custom"}
                onSelect={(stateName) =>
                  onChange({
                    ...value,
                    stateName,
                    stateSource: "list",
                    districtName: "",
                    districtSource: "list",
                  })
                }
                onSelectOther={() =>
                  onChange({
                    ...value,
                    stateName: "",
                    stateSource: "custom",
                    districtName: "",
                    districtSource: "custom",
                  })
                }
              />

              {value.stateSource === "custom" && (
                <Input
                  value={value.stateName}
                  maxLength={80}
                  placeholder="Type your state / province / region"
                  aria-label="Custom state or region"
                  onChange={(e) =>
                    onChange({
                      ...value,
                      stateName: e.target.value,
                      stateSource: "custom",
                    })
                  }
                />
              )}
            </div>
          ) : (
            <div>
              <label
                htmlFor="state-free-text"
                className="mb-1.5 block text-sm font-semibold text-[#0B1220]"
              >
                State / Province / Region (private, optional)
              </label>
              <Input
                id="state-free-text"
                value={value.stateName}
                maxLength={80}
                placeholder="Type your region (optional)"
                onChange={(e) =>
                  onChange({
                    ...value,
                    stateName: e.target.value,
                    stateSource: e.target.value.trim() ? "custom" : "none",
                  })
                }
              />
            </div>
          )}

          {!loadingChunk && (value.stateName || !hasStates) && (
            <div className="space-y-2.5">
              {hasDistricts && value.stateSource === "list" ? (
                <>
                  <SearchableSelect
                    id="district-select"
                    label={`${chunk?.districtLabel || "District / city / area"} (private)`}
                    placeholder={`Select ${(chunk?.districtLabel || "district / city / area").toLowerCase()}`}
                    value={value.districtSource === "list" ? value.districtName : ""}
                    options={districtOptions}
                    allowOther
                    isOtherSelected={value.districtSource === "custom"}
                    onSelect={(districtName) =>
                      onChange({
                        ...value,
                        districtName,
                        districtSource: "list",
                      })
                    }
                    onSelectOther={() =>
                      onChange({
                        ...value,
                        districtName: "",
                        districtSource: "custom",
                      })
                    }
                  />
                  {value.districtSource === "custom" && (
                    <Input
                      value={value.districtName}
                      maxLength={80}
                      placeholder={`Type your ${(chunk?.districtLabel || "district / city / area").toLowerCase()}`}
                      aria-label="Custom district or city"
                      onChange={(e) =>
                        onChange({
                          ...value,
                          districtName: e.target.value,
                          districtSource: "custom",
                        })
                      }
                    />
                  )}
                </>
              ) : (
                <div>
                  <label
                    htmlFor="district-free-text"
                    className="mb-1.5 block text-sm font-semibold text-[#0B1220]"
                  >
                    {chunk?.districtLabel || "District / city / area"} (private, optional)
                  </label>
                  <Input
                    id="district-free-text"
                    value={value.districtName}
                    maxLength={80}
                    placeholder="Type your district, city, or area (optional)"
                    onChange={(e) =>
                      onChange({
                        ...value,
                        districtName: e.target.value,
                        districtSource: e.target.value.trim() ? "custom" : "none",
                      })
                    }
                  />
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
