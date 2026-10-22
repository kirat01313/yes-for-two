import { ProgramType } from './program';

export type MemoryOrigin = 'draw' | 'manual';

export interface Memory {
  id: number;
  type: ProgramType;
  name: string;
  category: string;
  place: string;
  nights: number | null;
  price: number | null;
  icon: string;
  image: string | null;
  lat: number;
  lon: number;
  date: string;
  went: boolean;
  note: string;
  origin: MemoryOrigin;
}

export type NewMemory = Omit<Memory, 'id'>;

export interface MemoryFormData {
  name: string;
  type: ProgramType;
  location: { name: string; lat: number; lon: number };
  date: string;
  note: string;
}