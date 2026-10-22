export type ProgramType = 'restaurant' | 'experience' | 'trip';

export type RequestStatus = 'idle' | 'loading' | 'empty' | 'error' | 'success';

export const PROGRAMS: { value: ProgramType; icon: string }[] = [
  { value: 'restaurant', icon: 'restaurant' },
  { value: 'experience', icon: 'local_activity' },
  { value: 'trip', icon: 'flight_takeoff' },
];