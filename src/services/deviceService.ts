import type { Id, Paged } from '../types/api'
import type { Device, DeviceInput } from '../types/device'
import type { ListQuery } from '../types/list'
import { request } from './http'
import { buildQuery } from '../logic/buildQuery'

const WITH_CLIENT = ['client']

export const deviceService = {
  list: (query: ListQuery) =>
    request<Paged<Device>>('/devices', { params: buildQuery(query, WITH_CLIENT) }),

  get: (id: Id) =>
    request<Device>(`/devices/${id}`, { params: new URLSearchParams({ _expand: 'client' }) }),

  create: (input: DeviceInput) => request<Device>('/devices', { method: 'POST', body: input }),

  update: (id: Id, input: DeviceInput) =>
    request<Device>(`/devices/${id}`, { method: 'PUT', body: input }),

  remove: (id: Id) => request<null>(`/devices/${id}`, { method: 'DELETE' }),
}
