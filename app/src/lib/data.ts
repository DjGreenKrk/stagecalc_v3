import type { Event, Location, Device, PowerConnector, EventDevice, Assignment, User } from './definitions';

export const mockUser: User = {
  id: 'user-1',
  name: 'Alex Volt',
  email: 'alex.volt@example.com',
  role: 'technician',
  avatarUrl: 'https://picsum.photos/seed/1/40/40',
};

export const allLocations: Location[] = [
  { id: 'loc-1', name: 'Main Stage Arena', address: '123 Music Row, Nashville, TN, USA' },
  { id: 'loc-2', name: 'Convention Center Hall B', address: '456 Expo Ave, Las Vegas, NV, USA' },
];

export const allDevices: Device[] = [
  // This data is now managed in Firestore.
];

export const allPowerConnectors: PowerConnector[] = [
  { id: 'conn-1', locationId: 'loc-1', type: '16A', phases: 1, maxCurrentA: 16 },
  { id: 'conn-2', locationId: 'loc-1', type: '32A', phases: 3, maxCurrentA: 32 },
  { id: 'conn-3', locationId: 'loc-1', type: '63A', phases: 3, maxCurrentA: 63 },
  { id: 'conn-4', locationId: 'loc-2', type: '16A', phases: 1, maxCurrentA: 16 },
  { id: 'conn-5', locationId: 'loc-2', type: '16A', phases: 1, maxCurrentA: 16 },
];

export const allEvents: Event[] = [
  {
    id: 'evt-1',
    name: 'Summer Music Festival 2024',
    date: '2024-08-15T10:00:00.000Z',
    description: 'Annual outdoor music festival featuring top artists.',
    ownerUserId: 'user-1',
    locationId: 'loc-1',
    sharedWith: [],
  },
  {
    id: 'evt-2',
    name: 'Tech Innovate Conference',
    date: '2024-09-22T09:00:00.000Z',
    description: 'The biggest tech conference of the year.',
    ownerUserId: 'user-1',
    locationId: 'loc-2',
    sharedWith: [],
  },
];

export const allEventDevices: EventDevice[] = [
  // Event 1
  { id: 'ed-1', eventId: 'evt-1', deviceId: 'dev-1', quantity: 24 },
  { id: 'ed-2', eventId: 'evt-1', deviceId: 'dev-2', quantity: 12 },
  { id: 'ed-3', eventId: 'evt-1', deviceId: 'dev-3', quantity: 8 },
  { id: 'ed-4', eventId: 'evt-1', deviceId: 'dev-4', quantity: 16 },
  { id: 'ed-5', eventId: 'evt-1', deviceId: 'dev-5', quantity: 8 },
  // Event 2
  { id: 'ed-6', eventId: 'evt-2', deviceId: 'dev-1', quantity: 50 },
  { id: 'ed-7', eventId: 'evt-2', deviceId: 'dev-4', quantity: 10 },
];

export const allAssignments: Assignment[] = [
  // Event 1
  { id: 'assign-1', eventId: 'evt-1', deviceId: 'dev-2', powerConnectorId: 'conn-2', phase: 'N/A' },
  { id: 'assign-2', eventId: 'evt-1', deviceId: 'dev-3', powerConnectorId: 'conn-3', phase: 'N/A' },
];
