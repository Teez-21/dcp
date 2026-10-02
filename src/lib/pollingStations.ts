import stationData from "@/data/polling-stations.json";
import { locKey, simpleName, type Puesto } from "@/lib/electoral";

export type PollingStationGeo = {
  station_key: string;
  geo_code: string;
  zone_code: string;
  source_locality_code: string;
  locality_name: string;
  station_number: string;
  name: string;
  site_name: string;
  address: string;
  longitude: number;
  latitude: number;
  upz_code: string;
  upz_name: string;
  join_status: string;
};

type StationCollection = {
  source_url: string;
  summary: {
    source_points: number;
    assigned_to_upz: number;
    outside_upz: number;
    ambiguous_boundary: number;
    different_locality_match: number;
    upz_count: number;
    upz_with_stations: number;
    upz_without_stations: number;
    upzs_without_stations: { codigo_upz: string; nombre_upz: string; localidad: string }[];
  };
  stations: PollingStationGeo[];
};

const collection = stationData as StationCollection;
const normalizeCode = (value: unknown): string => {
  const raw = String(value ?? "").trim().toUpperCase();
  return /^\d+$/.test(raw) ? String(Number(raw)) : raw;
};

const byKey = new Map(collection.stations.map((station) => [station.station_key, station]));
const byName = new Map<string, PollingStationGeo[]>();
for (const station of collection.stations) {
  const key = `${locKey(station.locality_name)}|${simpleName(station.name)}`;
  const matches = byName.get(key) || [];
  matches.push(station);
  byName.set(key, matches);
}

export const pollingStationSummary = collection.summary;
export const pollingStationGeo = collection.stations;

/** Match an electoral MMV post to its public point and its spatially assigned UPZ. */
export function stationForPuesto(puesto: Puesto): PollingStationGeo | undefined {
  const idParts = String(puesto.id ?? "").split("-");
  const zone = normalizeCode(puesto.zona ?? idParts[0]);
  const number = normalizeCode(puesto.num ?? idParts.slice(1).join("-"));
  const direct = byKey.get(`${zone}-${number}`);
  if (direct) return direct;

  const locality = locKey(puesto.localidad);
  const name = simpleName(puesto.name);
  if (!name) return undefined;
  const matches = byName.get(`${locality}|${name}`) || [];
  return matches.length === 1 ? matches[0] : undefined;
}
