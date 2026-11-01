import type { Id } from './api'

export type Role = 'staff' | 'user'

export interface User {
  id: Id
  name: string
  email: string
  role: Role
}

export interface LoginRequest {
  email: string
  password: string
}

// Response of POST /login
export interface LoginResponse {
  token: string
  user: User
}
