'use client';

export type UserRole = 'admin' | 'technician' | 'viewer';

export type User = {
  id: string;
  name?: string;
  email: string;
  role?: UserRole;
  avatar?: string;
  avatarUrl?: string; // Keep for compatibility if used elsewhere
  favorites?: string[];
};

export type UserFavoriteDevices = {
  userId: string;
  deviceIds: string[];
}

export type PowerConnectorGroup = {
  id: string;
  name: string;
  connectors: PowerConnector[];
  sourceInput?: { // Connection to a parent connector
    parentGroupId: string;
    parentConnectorId: string;
  };
  inputConnectorType?: string; // e.g. "63A CEE 5P", used for filtering
  isLocationGroup?: boolean;
  deviceId?: string;
};

export type Contact = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
};

export type Location = {
  id: string;
  name: string;
  address: string;
  powerConnectors?: PowerConnector[]; // For backwards compatibility
  powerConnectorGroups?: PowerConnectorGroup[];
  capacity?: number;
  notes?: string;
  contacts?: Contact[];
  documents?: Document[];
};

export type Document = {
  id: string;
  name: string;
  url: string;
};

export type DeviceCategoryName = "Oświetlenie" | "Dźwięk" | "Multimedia" | "Okablowanie i dystrybucja" | "Rigging" | "Inne";

export type Subcategory = {
  key: string;
  label: string; // Polish label as fallback
};

export type DeviceCategory = {
  name: DeviceCategoryName;
  slug: string;
  collectionName: string;
  subcategories?: Subcategory[];
}

export const deviceCategories: DeviceCategory[] = [
  {
    name: "Oświetlenie", slug: "lighting", collectionName: "lighting_devices", subcategories: [
      { key: "moving_heads", label: "Urządzenia inteligentne" },
      { key: "static_lighting", label: "Oświetlenie statyczne" },
      { key: "controllers", label: "Sterowanie i dystrybucja sygnału" },
      { key: "smoke_generators", label: "Wytwornice dymu" }
    ]
  },
  {
    name: "Dźwięk", slug: "sound", collectionName: "sound_devices", subcategories: [
      { key: "speakers", label: "Głośniki" },
      { key: "amplifiers", label: "Wzmacniacze" },
      { key: "sound_controllers", label: "Sterowanie i dystrybucja sygnału" }
    ]
  },
  {
    name: "Multimedia", slug: "multimedia", collectionName: "multimedia_devices", subcategories: [
      { key: "projectors", label: "Projektory" },
      { key: "projection_screens", label: "Ekrany projekcyjne" },
      { key: "tvs", label: "Telewizory" },
      { key: "led_screens", label: "Ekrany LED" },
      { key: "signal_distribution", label: "Sterowanie i dystrybucja sygnału" },
    ]
  },
  {
    name: "Okablowanie i dystrybucja", slug: "cabling", collectionName: "cabling_devices", subcategories: [
      { key: "power_cables", label: "Kable zasilające" },
      { key: "distribution_boxes", label: "Rozdzielnice" },
      { key: "adapters", label: "Adaptery i redukcje" },
    ]
  },
  {
    name: "Rigging", slug: "rigging", collectionName: "rigging_devices", subcategories: [
      { key: "trusses", label: "Kratownice" },
      { key: "hoists", label: "Wciągarki" },
      { key: "hooks", label: "Haki i zawiesia" }
    ]
  },
  { name: "Inne", slug: "other", collectionName: "other_devices" },
];


export type DistributionOutput = {
  type: string;
  quantity: number;
};

export type Outlet = {
  id: string;
  name: string;
  phase: 'L1' | 'L2' | 'L3' | 'All';
  type: PowerConnectorType;
};

export type PowerPreset = {
  id: string;
  name: string;
  outlets: Outlet[];
};

export type TrussLoadChartEntry = {
  id: string;
  length: number;
  pointLoad: number;
  deflectionPointLoad?: number;
  distribLoad: number;
  deflectionDistribLoad?: number;
};

export type WeightChartEntry = {
  id: string;
  length: number;
  weight: number;
};

export type Device = {
  id: string;
  name: string;
  manufacturer: string;
  category: DeviceCategoryName;
  subcategory?: string;
  powerW: number;
  currentA: number;
  weightKg: number;
  ipRating?: string;
  notes?: string;

  // Lighting specific
  lightSourceType?: string; // e.g. spot, wash, beam
  bulbType?: string; // e.g. HMI 575, MSR 700
  controlProtocols?: string[];
  dmxModes?: string; // e.g. "16/24/32"
  zoomRange?: string; // e.g. "10-40"
  colorSystem?: string; // e.g. RGBW, CMY
  cameraReady?: boolean;
  riggingPoints?: number;

  // Sound specific
  spl?: number;
  avgPowerW?: number;
  avgCurrentA?: number;
  powerType?: 'active' | 'passive';
  protocols?: string[];
  mountType?: string[];
  powerConnectorsIn?: string[];

  // Multimedia specific
  // Projector
  technology?: 'DLP' | 'LCD' | 'LCoS';
  brightness?: number; // ANSI lm for projectors, nits for displays
  nativeResolution?: string;
  throwRatio?: string;
  signalInputs?: string[];
  lensShift?: boolean;
  interchangeableLenses?: boolean;
  orientation?: ('front' | 'rear' | 'ceiling' | 'portrait' | 'landscape')[];

  // Projection Screen
  screenType?: 'ramowy' | 'elektryczny' | 'tripod' | 'fastfold';
  screenFormat?: '16:9' | '16:10' | '4:3' | 'custom';
  screenSize?: string; // "diagonal or dimensions"
  screenGain?: number;
  screenProjection?: 'front' | 'rear' | 'dual';

  // TV
  vesa?: string;

  // LED Screen
  pixelPitch?: number; // P2.6, P3.9 etc
  moduleResolution?: string;
  ledPowerAvg?: number;
  isIndoor?: boolean;
  maxModulesPerCircuit?: number;
  maxModulesPerSignalPath?: number;

  // Signal distribution
  distributionType?: 'processor' | 'scaler' | 'switcher' | 'splitter' | 'converter';
  inputsOutputs?: string;
  supportedResolutions?: string;
  latency?: string;

  // Cabling specific
  // Power Cables
  cableType?: string;
  crossSection?: number;
  conductorCount?: number;

  distributionInput?: string;
  distributionOutputs?: DistributionOutput[];
  presetId?: string; // Relation to power_presets

  // Adapters
  adapterIn?: string;
  adapterOut?: string;
  isThreePhase?: boolean;

  // Rigging specific
  // Truss
  trussType?: 'duo' | 'trio' | 'quatro';
  height?: number;
  width?: number;
  wallThickness?: number;
  loadChart?: TrussLoadChartEntry[];
  weightChart?: WeightChartEntry[];

  // Hoist
  wll?: number;
  speed?: number;
  chainLength?: number;
  controlType?: 'D8' | 'D8+' | 'C1';

  // Hook
  clampDiameterRange?: string;
};

export type PowerConnectorType =
  | '16A Uni-Schuko'
  | '16A CEE 3P'
  | '16A CEE 5P'
  | '32A CEE 3P'
  | '32A CEE 5P'
  | '63A CEE 5P'
  | '125A CEE 5P'
  | 'Powerlock 200A'
  | 'Powerlock 400A';

export type PowerConnector = {
  id: string;
  name?: string; // name is now optional as it was not present in older data
  locationId?: string; // Made optional as it's implicit when nested in a location
  type: PowerConnectorType;
  phases: 1 | 3;
  maxCurrentA: number;
  quantity?: number; // Make optional
  notes?: string;
  instanceId?: string; // For calculator runtime
  isManual?: boolean;   // For calculator runtime
};

export type Client = {
  id: string;
  name: string;
  ownerUserId: string;
  contactPerson?: string;
  email: string;
  phone?: string;
  address?: string;
  nip?: string;
  notes?: string;
};

export type CalculationGroup = {
  tempId: string;
  name: string;
  items: CalculationItem[];
  assignedConnectorIds?: string[];
  assignedTrussId?: string;
  assignedHooks?: {
    hookId: string;
    quantity: number;
  }[];
};

export type CalculationItem = {
  tempId: string;
  deviceId?: string;
  manualName?: string;
  manualWeight?: number;
  quantity: number;
};

export type TrussLoad = {
  id: string;
  calculationItemId?: string;
  deviceId?: string;
  manualName?: string;
  manualWeight?: number;
  quantity: number;
  riggingWeight: number;
  loadType: 'point' | 'udl';
  position: number;
};

export type Truss = {
  id: string;
  name: string;
  trussTypeId: string;
  length: number;
  supportMode: 'suspended' | 'supported';
  udlLimit?: number;
  pointLoadLimit?: number;
  totalLoadLimit: number;
  loads: TrussLoad[];
};

export type Calculation = {
  id: string;
  name: string;
  ownerUserId: string;
  lastModified: string;
  data: {
    groups: CalculationGroup[];
    connectorGroups: PowerConnectorGroup[];
    selectedLocationId: string | null;
    trusses?: Truss[];
  }
}

// Sound
export const SoundProtocols = ['Analog (XLR/TRS)', 'AES3', 'AES50', 'MADI', 'S/PDIF', 'Dante', 'AVB', 'Milan', 'RDNet'];
export const SoundPowerTypes = [{ id: 'active', label: 'Aktywne' }, { id: 'passive', label: 'Pasywne' }];
export const SoundMountTypes = ['Flyable', 'Stack', 'Pole', 'Truss Clamp', 'Rack Mount', 'Tabletop'];
export const SoundPowerConnectors = ['Schuko', 'PowerCON True1', 'PowerCON 20A', 'CEE 16A/1f', 'CEE 16A/3f', 'CEE 32A/1f', 'CEE 32A/3f', 'IEC'];

// Lighting
export const LightingControlProtocols = ['DMX', 'RDM', 'ArtNet', 'sACN'];
export const LightSourceTypes = ['spot', 'wash', 'beam', 'hybrid', 'pixel', 'other'];
export const StaticLightTypes = ['par', 'profile', 'fresnel', 'batten', 'blinder', 'strobe'];
export const ColorSystems = ['RGB', 'RGBW', 'RGBA', 'WW/CW', 'Tunable White', 'Discharge', 'Tungsten'];

// Generic Connectors
export const ConnectorTypes: PowerConnectorType[] = [
  '16A Uni-Schuko',
  '16A CEE 3P',
  '16A CEE 5P',
  '32A CEE 3P',
  '32A CEE 5P',
  '63A CEE 5P',
  '125A CEE 5P',
  'Powerlock 200A',
  'Powerlock 400A',
];

export const connectorTypeConfig: Record<string, { maxCurrentA: number; phases: 1 | 3 }> = {
  '16A Uni-Schuko': { maxCurrentA: 16, phases: 1 },
  '16A CEE 3P': { maxCurrentA: 16, phases: 1 },
  '16A CEE 5P': { maxCurrentA: 16, phases: 3 },
  '32A CEE 3P': { maxCurrentA: 32, phases: 1 },
  '32A CEE 5P': { maxCurrentA: 32, phases: 3 },
  '63A CEE 5P': { maxCurrentA: 63, phases: 3 },
  '125A CEE 5P': { maxCurrentA: 125, phases: 3 },
  'Powerlock 200A': { maxCurrentA: 200, phases: 3 },
  'Powerlock 400A': { maxCurrentA: 400, phases: 3 },
};
export type Event = {
  id: string;
  name: string;
  date: string;
  description?: string;
  ownerUserId: string;
  locationId: string;
  sharedWith: string[];
};

export type EventDevice = {
  id: string;
  eventId: string;
  deviceId: string;
  quantity: number;
};

export type Assignment = {
  id: string;
  eventId: string;
  deviceId: string;
  powerConnectorId: string;
  phase: string;
};

export type Connection = {
  id: string;
  calculationId: string;
  sourceDeviceId: string;
  sourceOutletId: string;
  targetDeviceId?: string;
  targetGroupId?: string;
  notes?: string;
};
