import { BusStop, RouteGeometrySegment } from '../src/types/cibus';

/**
 * Centralized CIBUS Cebu Route & Stop Dataset
 * Corridor: Il Corso / South Road Properties -> Cebu South Road corridor -> Downtown Cebu ->
 *           Fuente Osmeña -> N. Escario corridor -> Cebu IT Park.
 *
 * Stops follow the CIBUS route reference map: 9 stops on the southern corridor up to Fuente Osmeña + 4 on the northern extension.
 * Distinguishes VERIFIED historical launch stops from PROVISIONAL northern extension placeholders.
 */

export const INITIAL_CIBUS_STOPS: BusStop[] = [
  {
    id: 'stop-il-corso',
    stopCode: 'CIBUS-STP-01',
    stopName: 'Il Corso (SRP Terminal)',
    latitude: 10.26545,
    longitude: 123.87654,
    stopType: 'CIBUS_DESIGNATED',
    verificationStatus: 'VERIFIED',
    isVerifiedCibus: true,
    isActive: true,
    landmarkNotes:
      'CIBUS southern terminal at Il Corso Filinvest Lifemalls, Cebu South Coastal Road, South Road Properties (SRP)',
  },
  {
    id: 'stop-sm-seaside',
    stopCode: 'CIBUS-STP-02',
    stopName: 'SM Seaside',
    latitude: 10.27983,
    longitude: 123.8812,
    stopType: 'CIBUS_DESIGNATED',
    verificationStatus: 'VERIFIED',
    isVerifiedCibus: true,
    isActive: true,
    landmarkNotes:
      'CIBUS stop at SM Seaside City Cebu, South Road Properties (SRP)',
  },
  {
    id: 'stop-mambaling',
    stopCode: 'CIBUS-STP-03',
    stopName: 'Mambaling',
    latitude: 10.29031,
    longitude: 123.87786,
    stopType: 'CIBUS_DESIGNATED',
    verificationStatus: 'VERIFIED',
    isVerifiedCibus: true,
    isActive: true,
    landmarkNotes:
      'CIBUS stop at Mambaling, F. Vestil Street approaching Natalio Bacalso Avenue',
  },
  {
    id: 'stop-ccmc',
    stopCode: 'CIBUS-STP-04',
    stopName: 'Cebu City Medical Center',
    latitude: 10.29816,
    longitude: 123.892,
    stopType: 'CIBUS_DESIGNATED',
    verificationStatus: 'VERIFIED',
    isVerifiedCibus: true,
    isActive: true,
    landmarkNotes:
      'CIBUS stop at Cebu City Medical Center (CCMC), Natalio Bacalso Avenue',
  },
  {
    id: 'stop-csbt-brt',
    stopCode: 'CIBUS-BRT-05',
    stopName: 'Cebu South Bus Terminal',
    latitude: 10.29842,
    longitude: 123.89313,
    stopType: 'AUTHORIZED_BRT_LANE',
    verificationStatus: 'VERIFIED',
    isVerifiedCibus: true,
    isActive: true,
    landmarkNotes:
      'CIBUS stop at Cebu South Bus Terminal (CSBT), Natalio Bacalso Avenue',
  },
  {
    id: 'stop-citymall-bacalso',
    stopCode: 'CIBUS-STP-06',
    stopName: 'CityMall Bacalso',
    latitude: 10.29854,
    longitude: 123.89435,
    stopType: 'CIBUS_DESIGNATED',
    verificationStatus: 'VERIFIED',
    isVerifiedCibus: true,
    isActive: true,
    landmarkNotes:
      'CIBUS stop at CityMall Bacalso, Natalio Bacalso Avenue',
  },
  {
    id: 'stop-emall',
    stopCode: 'CIBUS-STP-07',
    stopName: 'Emall',
    latitude: 10.29871,
    longitude: 123.89527,
    stopType: 'CIBUS_DESIGNATED',
    verificationStatus: 'VERIFIED',
    isVerifiedCibus: true,
    isActive: true,
    landmarkNotes:
      'CIBUS stop at Elizabeth Mall (Emall), Natalio Bacalso Avenue / Leon Kilat Street',
  },
  {
    id: 'stop-central-bank',
    stopCode: 'CIBUS-BRT-08',
    stopName: 'Bangko Sentral ng Pilipinas',
    latitude: 10.30053,
    longitude: 123.89656,
    stopType: 'AUTHORIZED_BRT_LANE',
    verificationStatus: 'VERIFIED',
    isVerifiedCibus: true,
    isActive: true,
    landmarkNotes:
      'CIBUS stop at Bangko Sentral ng Pilipinas (Central Bank), Osmeña Boulevard / P. del Rosario Street',
  },
  {
    id: 'stop-mcdonalds-osmena',
    stopCode: 'CIBUS-BRT-09',
    stopName: 'Fuente BRT Station',
    latitude: 10.30877,
    longitude: 123.89363,
    stopType: 'AUTHORIZED_BRT_LANE',
    verificationStatus: 'VERIFIED',
    isVerifiedCibus: true,
    isActive: true,
    landmarkNotes:
      'CIBUS stop at Fuente BRT Station, Osmeña Boulevard, just south of Fuente Osmeña Circle',
  },
  {
    id: 'stop-escario-capitol',
    stopCode: 'CIBUS-PRV-10',
    stopName: 'Cebu Provincial Capitol',
    latitude: 10.31626,
    longitude: 123.89113,
    stopType: 'CIBUS_DESIGNATED',
    verificationStatus: 'PROVISIONAL',
    isVerifiedCibus: true,
    isActive: true,
    landmarkNotes:
      'CIBUS stop at Cebu Provincial Capitol, Osmeña Boulevard / N. Escario Street (northern extension)',
  },
  {
    id: 'stop-parklane',
    stopCode: 'CIBUS-PRV-11',
    stopName: 'Cebu Parklane International Hotel',
    latitude: 10.32023,
    longitude: 123.90334,
    stopType: 'CIBUS_DESIGNATED',
    verificationStatus: 'PROVISIONAL',
    isVerifiedCibus: true,
    isActive: true,
    landmarkNotes:
      'CIBUS stop at Cebu Parklane International Hotel, N. Escario Street / Archbishop Reyes Avenue (northern extension)',
  },
  {
    id: 'stop-ayala-center',
    stopCode: 'CIBUS-PRV-12',
    stopName: 'Ayala Center Cebu',
    latitude: 10.31764,
    longitude: 123.9029,
    stopType: 'CIBUS_DESIGNATED',
    verificationStatus: 'PROVISIONAL',
    isVerifiedCibus: true,
    isActive: true,
    landmarkNotes:
      'CIBUS stop at Ayala Center Cebu terminal, Cebu Business Park (northern extension)',
  },
  {
    id: 'stop-it-park',
    stopCode: 'CIBUS-STP-13',
    stopName: 'Cebu IT Park',
    latitude: 10.33002,
    longitude: 123.90713,
    stopType: 'CIBUS_DESIGNATED',
    verificationStatus: 'PROVISIONAL',
    isVerifiedCibus: true,
    isActive: true,
    landmarkNotes:
      'CIBUS northern endpoint at Cebu IT Park, Apas/Lahug (northern extension endpoint)',
  },
];

// Northbound ordered stop IDs: Il Corso -> Cebu IT Park
export const NORTHBOUND_STOP_IDS: string[] = [
  'stop-il-corso',
  'stop-sm-seaside',
  'stop-mambaling',
  'stop-ccmc',
  'stop-csbt-brt',
  'stop-citymall-bacalso',
  'stop-emall',
  'stop-central-bank',
  'stop-mcdonalds-osmena',
  'stop-escario-capitol',
  'stop-parklane',
  'stop-ayala-center',
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
      [10.26545, 123.87653],
      [10.26545, 123.87654],
      [10.26874, 123.87934],
      [10.26934, 123.87971],
      [10.26992, 123.87986],
      [10.2705, 123.87985],
      [10.27083, 123.8798],
      [10.27185, 123.87945],
      [10.27235, 123.87933],
      [10.27265, 123.87931],
      [10.27308, 123.87936],
      [10.27381, 123.87958],
      [10.27828, 123.8812],
      [10.27894, 123.88146],
      [10.27974, 123.88185],
      [10.28046, 123.88232],
      [10.28106, 123.8828],
      [10.28456, 123.88613],
      [10.28455, 123.88616],
      [10.28469, 123.88634],
      [10.28569, 123.88728],
      [10.28581, 123.88732],
      [10.28593, 123.88728],
      [10.28599, 123.88715],
      [10.28594, 123.88701],
      [10.28471, 123.88598],
      [10.28448, 123.88588],
      [10.28114, 123.88272],
      [10.28067, 123.88231],
      [10.27998, 123.88185],
      [10.27995, 123.88157],
      [10.27999, 123.88125],
      [10.27983, 123.8812],
      [10.27977, 123.88118],
      [10.27996, 123.88083],
      [10.28039, 123.88019],
      [10.27971, 123.87957],
      [10.28009, 123.87924],
      [10.28038, 123.87905],
      [10.28111, 123.87874],
      [10.28153, 123.87867],
      [10.28215, 123.87866],
      [10.28255, 123.87873],
      [10.28308, 123.87893],
      [10.28333, 123.87906],
      [10.28369, 123.87932],
      [10.28488, 123.88042],
      [10.28516, 123.8803],
      [10.28662, 123.87989],
      [10.28695, 123.87976],
      [10.28915, 123.8787],
      [10.28975, 123.87821],
      [10.29031, 123.87786],
      [10.29109, 123.87732],
      [10.29226, 123.87898],
      [10.29261, 123.87936],
      [10.2934, 123.88045],
      [10.29349, 123.88064],
      [10.2958, 123.88392],
      [10.29609, 123.8844],
      [10.29661, 123.8855],
      [10.29702, 123.88692],
      [10.29732, 123.88966],
      [10.29745, 123.89031],
      [10.29761, 123.89083],
      [10.29816, 123.892],
      [10.29831, 123.89243],
      [10.29842, 123.89313],
      [10.29854, 123.89435],
      [10.29861, 123.89498],
      [10.29871, 123.89527],
      [10.29885, 123.89554],
      [10.29894, 123.89559],
      [10.2996, 123.89687],
      [10.30053, 123.89656],
      [10.30683, 123.89428],
      [10.30877, 123.89363],
    ],
  },
  {
    id: 'seg-nb-provisional-north',
    label: 'Provisional Northern Corridor Extension (Fuente Osmeña → N. Escario St → Cebu IT Park)',
    verificationStatus: 'PROVISIONAL',
    dataSource: 'PROVISIONAL_CORRIDOR',
    coordinates: [
      [10.30877, 123.89363],
      [10.30916, 123.89351],
      [10.30934, 123.89357],
      [10.30949, 123.89372],
      [10.30968, 123.8938],
      [10.30994, 123.89382],
      [10.3101, 123.89378],
      [10.31039, 123.89356],
      [10.31049, 123.89336],
      [10.31057, 123.89303],
      [10.31068, 123.89293],
      [10.31621, 123.89097],
      [10.31626, 123.89113],
      [10.3166, 123.89208],
      [10.31667, 123.89216],
      [10.31693, 123.89285],
      [10.3175, 123.89459],
      [10.31809, 123.89789],
      [10.31859, 123.9],
      [10.31919, 123.9013],
      [10.32023, 123.90334],
      [10.32043, 123.90378],
      [10.32033, 123.90387],
      [10.32006, 123.90448],
      [10.32003, 123.90489],
      [10.3201, 123.90528],
      [10.32005, 123.90556],
      [10.31991, 123.90582],
      [10.31851, 123.90765],
      [10.31836, 123.90774],
      [10.31825, 123.90774],
      [10.31775, 123.90734],
      [10.31748, 123.90707],
      [10.31712, 123.90633],
      [10.31697, 123.90615],
      [10.31678, 123.90598],
      [10.3164, 123.90579],
      [10.31631, 123.9056],
      [10.31652, 123.90467],
      [10.31666, 123.90434],
      [10.31729, 123.90364],
      [10.31764, 123.9029],
      [10.31778, 123.90261],
      [10.32051, 123.9039],
      [10.32411, 123.90626],
      [10.32432, 123.90645],
      [10.32548, 123.90725],
      [10.32586, 123.90763],
      [10.32601, 123.90751],
      [10.32701, 123.90608],
      [10.32968, 123.9077],
      [10.33002, 123.90713],
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

