import type { Id } from './api'
import type { Client } from './client'

// The array is the single source: the type below is derived from it,
// and the same array can be mapped into <option> elements later.
export const DEVICE_TYPES = ['laptop', 'phone', 'tablet', 'desktop', 'console'] as const

export type DeviceType = (typeof DEVICE_TYPES)[number]

export interface Device {
  id: Id
  clientId: Id
  type: DeviceType
  brand: string
  model: string
  serialNumber: string
  // Present only when requested with ?_expand=client
  client?: Client | null
}

// What the client sends on POST/PUT: everything except the server-generated id and embedded data.
export type DeviceInput = Omit<Device, 'id' | 'client'>
