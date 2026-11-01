export type Id = number

export interface Paged<T> {
  first: number
  prev: number | null
  next: number | null
  last: number
  pages: number
  items: number
  data: T[]
}

export interface ApiErrorBody {
  message: string
  fields?: Record<string, string>
}

export type ApiErrorKind =
  | 'network' // no response
  | 'validation' // 400
  | 'unauthorized' // 401
  | 'forbidden' // 403
  | 'notFound' // 404
  | 'conflict' // 409
  | 'server' // 5xx
  | 'unknown'

export interface RequestError {
  kind: ApiErrorKind
  status: number | null
  message: string
  fields: Record<string, string>
}
