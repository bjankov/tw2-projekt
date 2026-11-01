import type { Id } from './api'
import type { Device } from './device'
import type { Service } from './service'

export const WORK_ORDER_STATUSES = ['received', 'in-progress', 'done', 'picked-up', 'cancelled'] as const

export type WorkOrderStatus = (typeof WORK_ORDER_STATUSES)[number]

export interface WorkOrder {
  id: Id
  orderNumber: string // format RN-2026-0001
  deviceId: Id
  serviceId: Id
  receivedAt: string // date as YYYY-MM-DD
  // Missing in seed data for unfinished orders, null when saved without a value.
  pickupAt?: string | null
  status: WorkOrderStatus
  description: string
  // Present only when requested with ?_expand=device / ?_expand=service
  device?: Device | null
  service?: Service | null
}

export type WorkOrderInput = Omit<WorkOrder, 'id' | 'device' | 'service'>
