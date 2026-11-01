import type { ApiErrorKind } from '../types/api'

export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status: number | null
  readonly serverMessage: string | null
  readonly fields: Record<string, string>

  constructor(
    kind: ApiErrorKind,
    status: number | null,
    technicalMessage: string,
    serverMessage: string | null = null,
    fields: Record<string, string> = {},
  ) {
    super(technicalMessage)
    this.name = 'ApiError'
    this.kind = kind
    this.status = status
    this.serverMessage = serverMessage
    this.fields = fields
  }
}
