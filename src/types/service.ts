import type { Id } from './api'

// A repair service from the catalogue (e.g. "Zamjena zaslona", 120 €).
export interface Service {
  id: Id
  name: string
  price: number
}
