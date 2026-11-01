export type SortDirection = 'asc' | 'desc'

export interface ListQuery {
  search: string
  sortBy: string | null
  sortDir: SortDirection
  page: number
  perPage: number
  filters: Record<string, string>
}
