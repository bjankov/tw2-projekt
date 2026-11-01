// Shapes shared by every resource of the API.

export type Id = number

// Response of a list request sent with ?_page=…&_per_page=…
export interface Paged<T> {
  first: number
  prev: number | null
  next: number | null
  last: number
  pages: number
  items: number
  data: T[]
}

// Body of every error response, e.g. { message: "Podaci nisu ispravni.", fields: { serialNumber: "…" } }
export interface ApiErrorBody {
  message: string
  fields?: Record<string, string>
}
