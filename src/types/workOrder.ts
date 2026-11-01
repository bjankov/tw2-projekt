import type { Id } from './api'
import type { Device } from './device'
import type { Service } from './service'

export const WORK_ORDER_STATUSES = ['received', 'in-progress', 'done', 'picked-up', 'cancelled'] as const

export type WorkOrderStatus = (typeof WORK_ORDER_STATUSES)[number]

export interface WorkOrder {
  id: Id
  orderNumber: string // RN-2026-0001
  deviceId: Id
  serviceId: Id
  receivedAt: string // YYYY-MM-DD
  pickupAt?: string | null
  status: WorkOrderStatus
  description: string
  device?: Device | null
  service?: Service | null
}

export type WorkOrderInput = Omit<WorkOrder, 'id' | 'device' | 'service'>
