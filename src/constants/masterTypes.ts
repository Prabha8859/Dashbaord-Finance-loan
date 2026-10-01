/**
 * Master `type` keys used across the admin panel.
 *
 * Masters are stored by a stable string key (`type`) rather than by Mongo `_id`,
 * so routes such as `/masters/type/banks` keep working after a re-seed.
 */

/** Masters that back the location cascade (Country → State → City → Pincode). */
export const LOCATION_MASTER_TYPES = {
  countries: "countries",
  states: "statesByCountry",
  cities: "citiesByState",
  pincodes: "pincodesByCity",
} as const;

export type LocationMasterType =
  (typeof LOCATION_MASTER_TYPES)[keyof typeof LOCATION_MASTER_TYPES];

/**
 * Location masters are managed on the Locations page, so they are hidden from
 * the Bank Details (generic master) list. `states` is the legacy flat list kept
 * for backwards compatibility with existing backend data.
 */
export const LOCATION_MASTER_TYPE_SET: ReadonlySet<string> = new Set<string>([
  "countries",
  "states",
  "statesByCountry",
  "citiesByState",
  "pincodesByCity",
]);

export const isLocationMasterType = (type: string): boolean =>
  LOCATION_MASTER_TYPE_SET.has(type);

/** Display labels used when a location master has to be created on the fly. */
export const LOCATION_MASTER_LABELS: Record<string, string> = {
  countries: "Countries",
  statesByCountry: "States by Country",
  citiesByState: "Cities by State",
  pincodesByCity: "Pincodes by City",
};
