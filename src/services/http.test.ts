import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { request } from './http'
import { ApiError } from './apiError'

const jsonResponse = (status: number, body: unknown) =>
  new Response(body === null ? null : JSON.stringify(body), { status })

const fakeFetch = vi.fn<typeof fetch>()

beforeEach(() => {
  vi.stubEnv('VITE_API_URL', 'http://api.test/')
  vi.stubGlobal('fetch', fakeFetch)
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  fakeFetch.mockReset()
})

const failingRequest = async (): Promise<ApiError> => {
  try {
    await request('/devices')
  } catch (error) {
    if (error instanceof ApiError) return error
    throw error
  }
  throw new Error('request() should have thrown')
}

describe('request', () => {
  it('builds the URL from VITE_API_URL, path and params', async () => {
    fakeFetch.mockResolvedValue(jsonResponse(200, []))
    await request('/devices', { params: new URLSearchParams({ _page: '1' }) })
    expect(fakeFetch.mock.calls[0][0]).toBe('http://api.test/devices?_page=1')
  })

  it('sends JSON body with the right method and header', async () => {
    fakeFetch.mockResolvedValue(jsonResponse(201, { id: 1 }))
    const result = await request<{ id: number }>('/devices', { method: 'POST', body: { brand: 'HP' } })
    const [, init] = fakeFetch.mock.calls[0]
    expect(init?.method).toBe('POST')
    expect(init?.headers).toEqual({ 'Content-Type': 'application/json' })
    expect(init?.body).toBe('{"brand":"HP"}')
    expect(result).toEqual({ id: 1 })
  })

  it('returns null for 204 No Content', async () => {
    fakeFetch.mockResolvedValue(jsonResponse(204, null))
    await expect(request('/devices/1', { method: 'DELETE' })).resolves.toBeNull()
  })

  it('throws a network error when no response arrives', async () => {
    fakeFetch.mockRejectedValue(new TypeError('Failed to fetch'))
    const error = await failingRequest()
    expect(error.kind).toBe('network')
    expect(error.status).toBeNull()
  })

  it('throws unauthorized for 401', async () => {
    fakeFetch.mockResolvedValue(jsonResponse(401, { message: 'Za ovu je radnju potrebna prijava.' }))
    const error = await failingRequest()
    expect(error.kind).toBe('unauthorized')
    expect(error.serverMessage).toBe('Za ovu je radnju potrebna prijava.')
  })

  it('throws server for 500 and logs the technical details', async () => {
    fakeFetch.mockResolvedValue(jsonResponse(500, { message: 'Na poslužitelju je došlo do pogreške.' }))
    const error = await failingRequest()
    expect(error.kind).toBe('server')
    expect(error.status).toBe(500)
    expect(console.error).toHaveBeenCalled()
  })

  it('passes field errors through for 400', async () => {
    const fields = { serialNumber: 'Uređaj s tim serijskim brojem već postoji.' }
    fakeFetch.mockResolvedValue(jsonResponse(400, { message: 'Podaci nisu ispravni.', fields }))
    const error = await failingRequest()
    expect(error.kind).toBe('validation')
    expect(error.fields).toEqual(fields)
  })
})
