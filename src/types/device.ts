import type { Id } from './api'
import type { Client } from './client'

export const DEVICE_TYPES = ['laptop', 'phone', 'tablet', 'desktop', 'console'] as const

export type DeviceType = (typeof DEVICE_TYPES)[number]

export interface Device {
  id: Id
  clientId: Id
  type: DeviceType
  brand: string
  model: string
  serialNumber: string
  client?: Client | null
}

export type DeviceInput = Omit<Device, 'id' | 'client'>
