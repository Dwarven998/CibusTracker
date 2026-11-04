import { BusStop, RouteGeometrySegment } from '../src/types/cibus';

/**
 * Centralized CIBUS Cebu Route & Stop Dataset
 * Corridor: Il Corso / South Road Properties -> Cebu South Road corridor -> Downtown Cebu ->
 *           Fuente Osmeña -> N. Escario corridor -> Cebu IT Park.
 *
 * Includes all 11 researched historical launch stops + provisional northern extension stops.
 * Distinguishes VERIFIED historical launch stops from PROVISIONAL northern extension placeholders.
 */

export const INITIAL_CIBUS_STOPS: BusStop[] = [
  // 1. Il Corso (SRP Terminal) - Historical Launch Stop
  {
    id: 'stop-il-corso',
    stopCode: 'CIBUS-STP-01',
    stopName: 'Il Corso (SRP Terminal)',
    latitude: 10.2673,
    longitude: 123.8744,
    stopType: 'CIBUS_DESIGNATED',
    verificationStatus: 'VERIFIED',
    isVerifiedCibus: true,
    isActive: true,
    landmarkNotes: 'Verified CIBUS Historical Launch Southern Terminal at Il Corso Filinvest Lifemalls, South Road Properties (SRP)',
  },
  // 2. SM Seaside City - Historical Launch Stop
  {
    id: 'stop-sm-seaside',
    stopCode: 'CIBUS-STP-02',
    stopName: 'SM Seaside City',
    latitude: 10.2817,
    longitude: 123.8810,
    stopType: 'CIBUS_DESIGNATED',
    verificationStatus: 'VERIFIED',
    isVerifiedCibus: true,
    isActive: true,
    landmarkNotes: 'Verified CIBUS Historical Launch Stop at SM Seaside City Cebu, South Road Properties (SRP)',
  },
  // 3. B. Aranas Street - Historical Launch Stop
  {
    id: 'stop-b-aranas',
    stopCode: 'CIBUS-STP-03',
    stopName: 'B. Aranas Street',
    latitude: 10.2918,
    longitude: 123.8884,
    stopType: 'CIBUS_DESIGNATED',
    verificationStatus: 'VERIFIED',
    isVerifiedCibus: true,
    isActive: true,
    landmarkNotes: 'Verified CIBUS Historical Launch Stop near B. Aranas St / Cebu South Road junction (San Nicolas / Duljo-Fatima)',
  },
  // 4. Petron (Natalio Bacalso Avenue) - Historical Launch Stop
  {
    id: 'stop-petron-bacalso',
    stopCode: 'CIBUS-STP-04',
    stopName: 'Petron (Natalio Bacalso Avenue)',
    latitude: 10.2932,
    longitude: 123.8832,
    stopType: 'CIBUS_DESIGNATED',
    verificationStatus: 'VERIFIED',
    isVerifiedCibus: true,
    isActive: true,
    landmarkNotes: 'Verified CIBUS Historical Launch Stop along Natalio Bacalso Avenue (Mambaling / Basak corridor)',
  },
  // 5. Gaisano Jai Alai - Historical Launch Stop
  {
    id: 'stop-gaisano-jai-alai',
    stopCode: 'CIBUS-STP-05',
    stopName: 'Gaisano Jai Alai',
    latitude: 10.2946,
    longitude: 123.8862,
    stopType: 'CIBUS_DESIGNATED',
    verificationStatus: 'VERIFIED',
    isVerifiedCibus: true,
    isActive: true,
    landmarkNotes: 'Verified CIBUS Historical Launch Stop at former Gaisano Fiesta Mall / Jai Alai, N. Bacalso Ave, Mambaling',
  },
  // 6. Budget Builders - Historical Launch Stop
  {
    id: 'stop-budget-builders',
    stopCode: 'CIBUS-STP-06',
    stopName: 'Budget Builders',
    latitude: 10.2959,
    longitude: 123.8891,
    stopType: 'CIBUS_DESIGNATED',
    verificationStatus: 'VERIFIED',
    isVerifiedCibus: true,
    isActive: true,
    landmarkNotes: 'Verified CIBUS Historical Launch Stop at Budget Builders along Natalio Bacalso Avenue',
  },
  // 7. Phoenix (Natalio Bacalso Avenue) - Historical Launch Stop
  {
    id: 'stop-phoenix-bacalso',
    stopCode: 'CIBUS-STP-07',
    stopName: 'Phoenix (Natalio Bacalso Avenue)',
    latitude: 10.2971,
    longitude: 123.8914,
    stopType: 'CIBUS_DESIGNATED',
    verificationStatus: 'VERIFIED',
    isVerifiedCibus: true,
    isActive: true,
    landmarkNotes: 'Verified CIBUS Historical Launch Stop near Phoenix Petroleum station along Natalio Bacalso Avenue',
  },
  // 8. Cebu South Bus Terminal - Historical Launch Stop
  {
    id: 'stop-csbt-brt',
    stopCode: 'CIBUS-BRT-08',
    stopName: 'Cebu South Bus Terminal',
    latitude: 10.2983,
    longitude: 123.8934,
    stopType: 'AUTHORIZED_BRT_LANE',
    verificationStatus: 'VERIFIED',
    isVerifiedCibus: true,
    isActive: true,
    landmarkNotes: 'Verified CIBUS Historical Launch Stop & Authorized CBRT Corridor Stop at Cebu South Bus Terminal (N. Bacalso Ave)',
  },
  // 9. Central Bank - Historical Launch Stop
  {
    id: 'stop-central-bank',
    stopCode: 'CIBUS-BRT-09',
    stopName: 'Central Bank',
    latitude: 10.3019,
    longitude: 123.8957,
    stopType: 'AUTHORIZED_BRT_LANE',
    verificationStatus: 'VERIFIED',
    isVerifiedCibus: true,
    isActive: true,
    landmarkNotes: 'Verified CIBUS Historical Launch Stop at Bangko Sentral ng Pilipinas (Central Bank), Osmeña Boulevard / P. del Rosario',
  },
  // 10. DOH Office - Historical Launch Stop
  {
    id: 'stop-doh-office',
    stopCode: 'CIBUS-BRT-10',
    stopName: 'DOH Office',
    latitude: 10.3075,
    longitude: 123.8943,
    stopType: 'AUTHORIZED_BRT_LANE',
    verificationStatus: 'VERIFIED',
    isVerifiedCibus: true,
    isActive: true,
    landmarkNotes: 'Verified CIBUS Historical Launch Stop in front of Department of Health (DOH Region VII) / Vicente Sotto, Osmeña Boulevard',
  },
  // 11. McDonald's (Osmeña Boulevard) - Historical Launch Stop
  {
    id: 'stop-mcdonalds-osmena',
    stopCode: 'CIBUS-BRT-11',
    stopName: "McDonald's (Osmeña Boulevard)",
    latitude: 10.3103,
    longitude: 123.8939,
    stopType: 'AUTHORIZED_BRT_LANE',
    verificationStatus: 'VERIFIED',
    isVerifiedCibus: true,
    isActive: true,
    landmarkNotes: "Verified CIBUS Historical Launch Stop at McDonald's Fuente Osmeña Circle / Osmeña Boulevard",
  },
  // 12. N. Escario Street (Capitol Site) - Provisional Placeholder Stop along N. Escario Corridor
  {
    id: 'stop-escario-capitol',
    stopCode: 'CIBUS-PRV-12',
    stopName: 'N. Escario Street (Capitol Site – Placeholder)',
    latitude: 10.3168,
    longitude: 123.8942,
    stopType: 'CIBUS_DESIGNATED',
    verificationStatus: 'PROVISIONAL',
    isVerifiedCibus: true,
    isActive: true,
    landmarkNotes: 'PROVISIONAL PLACEHOLDER STOP along N. Escario Street corridor near Cebu Provincial Capitol (Unverified intermediate stop sequence)',
  },
  // 13. Gorordo / Salinas Drive Junction - Provisional Placeholder Stop
  {
    id: 'stop-gorordo-salinas',
    stopCode: 'CIBUS-PRV-13',
    stopName: 'Salinas Drive / Lahug (Provisional Placeholder)',
    latitude: 10.3256,
    longitude: 123.9035,
    stopType: 'CIBUS_DESIGNATED',
    verificationStatus: 'PROVISIONAL',
    isVerifiedCibus: true,
    isActive: true,
    landmarkNotes: 'PROVISIONAL PLACEHOLDER STOP along Gorordo Ave / Salinas Drive approaching Cebu IT Park (Unverified intermediate stop sequence)',
  },
  // 14. Cebu IT Park - Researched Northern Endpoint
  {
    id: 'stop-it-park',
    stopCode: 'CIBUS-STP-14',
    stopName: 'Cebu IT Park',
    latitude: 10.3306,
    longitude: 123.9062,
    stopType: 'CIBUS_DESIGNATED',
    verificationStatus: 'PROVISIONAL',
    isVerifiedCibus: true,
    isActive: true,
    landmarkNotes: 'Researched Northern Endpoint at Cebu IT Park Transport Terminal, Apas/Lahug (Northern extension endpoint)',
  },
];

// Northbound ordered stop IDs: Il Corso -> Cebu IT Park
export const NORTHBOUND_STOP_IDS: string[] = [
  'stop-il-corso',
  'stop-sm-seaside',
  'stop-petron-bacalso',
  'stop-gaisano-jai-alai',
  'stop-budget-builders',
  'stop-phoenix-bacalso',
  'stop-b-aranas',
  'stop-csbt-brt',
  'stop-central-bank',
  'stop-doh-office',
  'stop-mcdonalds-osmena',
  'stop-escario-capitol',
  'stop-gorordo-salinas',
  'stop-it-park',
];

// Southbound ordered stop IDs: Cebu IT Park -> Il Corso
export const SOUTHBOUND_STOP_IDS: string[] = [...NORTHBOUND_STOP_IDS].reverse();

/**
 * Road-following GeoJSON polyline segments for Northbound (Il Corso -> Cebu IT Park)
 * Follows actual Cebu road geometry:
 *  - Segment 1 (VERIFIED): SRP Coastal Road -> Mambaling Access / Vestil St -> N. Bacalso Ave -> Osmeña Blvd -> Fuente Osmeña
 *  - Segment 2 (PROVISIONAL): Fuente Osmeña -> Osmeña Blvd (Capitol) -> N. Escario St -> Gorordo Ave -> Salinas Drive -> Cebu IT Park
 */
export const NORTHBOUND_GEOMETRY_SEGMENTS: RouteGeometrySegment[] = [
  {
    id: 'seg-nb-verified-launch',
    label: 'Verified Historical Launch Corridor (Il Corso SRP → N. Bacalso Ave → Osmeña Blvd / Fuente)',
    verificationStatus: 'VERIFIED',
    dataSource: 'ROAD_FOLLOWING_OSM',
    coordinates: [
      [10.2673, 123.8744], // Il Corso (SRP Terminal)
      [10.2712, 123.8768], // SRP Coastal Road north curve
      [10.2764, 123.8794], // SRP Viaduct approach
      [10.2817, 123.8810], // SM Seaside City
      [10.2862, 123.8805], // Vestil St / Mambaling SRP Access Road
      [10.2912, 123.8809], // Mambaling Flyover junction
      [10.2932, 123.8832], // Petron (Natalio Bacalso Avenue)
      [10.2946, 123.8862], // Gaisano Jai Alai
      [10.2959, 123.8891], // Budget Builders
      [10.2971, 123.8914], // Phoenix (Natalio Bacalso Avenue)
      [10.2918, 123.8884], // B. Aranas Street loop / junction
      [10.2962, 123.8918], // Return to N. Bacalso Ave main carriageway
      [10.2983, 123.8934], // Cebu South Bus Terminal
      [10.2995, 123.8952], // Leon Kilat / P. del Rosario intersection
      [10.3019, 123.8957], // Central Bank (Osmeña Blvd)
      [10.3046, 123.8949], // Osmeña Blvd / Harrison Park
      [10.3075, 123.8943], // DOH Office (Osmeña Blvd)
      [10.3103, 123.8939], // McDonald's (Osmeña Boulevard / Fuente Circle)
    ],
  },
  {
    id: 'seg-nb-provisional-north',
    label: 'Provisional Northern Corridor Extension (Fuente Osmeña → N. Escario St → Cebu IT Park)',
    verificationStatus: 'PROVISIONAL',
    dataSource: 'PROVISIONAL_CORRIDOR',
    coordinates: [
      [10.3103, 123.8939], // Fuente Osmeña Circle
      [10.3138, 123.8919], // Upper Osmeña Blvd approaching Capitol
      [10.3162, 123.8912], // Cebu Provincial Capitol turn to N. Escario
      [10.3168, 123.8942], // N. Escario Street (Capitol Site)
      [10.3177, 123.8986], // N. Escario St / Kamputhaw
      [10.3186, 123.9012], // Escario / Gorordo Avenue intersection
      [10.3220, 123.9022], // Gorordo Avenue (Lahug)
      [10.3256, 123.9035], // Salinas Drive / Lahug
      [10.3284, 123.9051], // Salinas Drive approaching IT Park
      [10.3306, 123.9062], // Cebu IT Park Terminal
    ],
  },
];

export const SOUTHBOUND_GEOMETRY_SEGMENTS: RouteGeometrySegment[] = [
  {
    id: 'seg-sb-provisional-north',
    label: 'Provisional Northern Corridor Extension (Cebu IT Park → N. Escario St → Fuente Osmeña)',
    verificationStatus: 'PROVISIONAL',
    dataSource: 'PROVISIONAL_CORRIDOR',
    coordinates: [...NORTHBOUND_GEOMETRY_SEGMENTS[1].coordinates].reverse(),
  },
  {
    id: 'seg-sb-verified-launch',
    label: 'Verified Historical Launch Corridor (Fuente / Osmeña Blvd → N. Bacalso Ave → Il Corso SRP)',
    verificationStatus: 'VERIFIED',
    dataSource: 'ROAD_FOLLOWING_OSM',
    coordinates: [...NORTHBOUND_GEOMETRY_SEGMENTS[0].coordinates].reverse(),
  },
];

export function flattenRouteCoordinates(segments: RouteGeometrySegment[]): [number, number][] {
  const pts: [number, number][] = [];
  for (const seg of segments) {
    for (const coord of seg.coordinates) {
      if (
        pts.length === 0 ||
        pts[pts.length - 1][0] !== coord[0] ||
        pts[pts.length - 1][1] !== coord[1]
      ) {
        pts.push(coord);
      }
    }
  }
  return pts;
}

