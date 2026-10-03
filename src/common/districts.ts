// Single source of truth for Nova Terra's neighborhoods — shared by
// MunicipalService.district (src/database/seed.ts) and User.district
// (profile), so both use exactly the same closed set of values.
export const DISTRICTS = [
  'Centre-Ville',
  'Port Stellaire',
  'Quartier des Dunes',
  'Hauts de Nova',
  'Faubourg Est',
] as const;

export type District = (typeof DISTRICTS)[number];
