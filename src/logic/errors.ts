import type { ApiErrorKind, RequestError } from '../types/api'
import { ApiError } from '../services/apiError'

const USER_MESSAGES: Record<ApiErrorKind, string> = {
  network: 'Poslužitelj nije dostupan. Provjerite je li pokrenut i pokušajte ponovno.',
  validation: 'Podaci nisu ispravni. Provjerite označena polja.',
  unauthorized: 'Prijava je istekla ili nije valjana. Prijavite se ponovno.',
  forbidden: 'Nemate ovlasti za ovu radnju.',
  notFound: 'Traženi zapis ne postoji.',
  conflict: 'Radnju nije moguće izvršiti zbog povezanih zapisa.',
  server: 'Na poslužitelju je došlo do pogreške. Pokušajte ponovno kasnije.',
  unknown: 'Došlo je do neočekivane pogreške.',
}

export const errorKindFromStatus = (status: number): ApiErrorKind => {
  if (status === 400) return 'validation'
  if (status === 401) return 'unauthorized'
  if (status === 403) return 'forbidden'
  if (status === 404) return 'notFound'
  if (status === 409) return 'conflict'
  if (status >= 500) return 'server'
  return 'unknown'
}

const prefersServerMessage = (status: number | null): boolean =>
  status !== null && status >= 400 && status < 500

export const toRequestError = (error: unknown): RequestError => {
  if (!(error instanceof ApiError)) {
    return { kind: 'unknown', status: null, message: USER_MESSAGES.unknown, fields: {} }
  }
  const { kind, status, serverMessage, fields } = error
  const message =
    prefersServerMessage(status) && serverMessage ? serverMessage : USER_MESSAGES[kind]
  return { kind, status, message, fields: { ...fields } }
}
