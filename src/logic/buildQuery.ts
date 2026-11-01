import type { ListQuery } from '../types/list'

type Param = [name: string, value: string]

const sortParam = (sortBy: string | null, sortDir: ListQuery['sortDir']): string =>
  sortBy ? `${sortDir === 'desc' ? '-' : ''}${sortBy}` : ''

export const buildQuery = (
  { search, sortBy, sortDir, page, perPage, filters }: ListQuery,
  expand: string[] = [],
): URLSearchParams => {
  const params: Param[] = [
    ['q', search.trim()],
    ['_sort', sortParam(sortBy, sortDir)],
    ['_page', String(page)],
    ['_per_page', String(perPage)],
    ...Object.entries(filters),
    ...expand.map((name): Param => ['_expand', name]),
  ]
  return new URLSearchParams(params.filter(([, value]) => value !== ''))
}
