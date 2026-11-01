import { describe, expect, it } from 'vitest'
import { buildQuery } from './buildQuery'
import type { ListQuery } from '../types/list'

const base: ListQuery = {
  search: '',
  sortBy: null,
  sortDir: 'asc',
  page: 1,
  perPage: 10,
  filters: {},
}

describe('buildQuery', () => {
  it('always sends page and page size', () => {
    expect(buildQuery(base).toString()).toBe('_page=1&_per_page=10')
  })

  it('adds trimmed search text as q', () => {
    expect(buildQuery({ ...base, search: '  hp ' }).get('q')).toBe('hp')
  })

  it('omits q when the search is only whitespace', () => {
    expect(buildQuery({ ...base, search: '   ' }).has('q')).toBe(false)
  })

  it('prefixes the sort field with - for descending order', () => {
    expect(buildQuery({ ...base, sortBy: 'brand', sortDir: 'asc' }).get('_sort')).toBe('brand')
    expect(buildQuery({ ...base, sortBy: 'brand', sortDir: 'desc' }).get('_sort')).toBe('-brand')
  })

  it('adds non-empty filters and skips empty ones', () => {
    const params = buildQuery({ ...base, filters: { type: 'laptop', clientId: '' } })
    expect(params.get('type')).toBe('laptop')
    expect(params.has('clientId')).toBe(false)
  })

  it('adds one _expand per embedded resource', () => {
    expect(buildQuery(base, ['client', 'service']).getAll('_expand')).toEqual(['client', 'service'])
  })

  it('does not modify the query object it receives', () => {
    const query: ListQuery = { ...base, filters: { type: 'phone' } }
    const snapshot = structuredClone(query)
    buildQuery(query, ['client'])
    expect(query).toEqual(snapshot)
  })
})
