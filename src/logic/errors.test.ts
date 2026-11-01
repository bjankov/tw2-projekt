import { describe, expect, it } from 'vitest'
import { errorKindFromStatus, toRequestError } from './errors'
import { ApiError } from '../services/apiError'

describe('errorKindFromStatus', () => {
  it.each([
    [400, 'validation'],
    [401, 'unauthorized'],
    [403, 'forbidden'],
    [404, 'notFound'],
    [409, 'conflict'],
    [500, 'server'],
    [503, 'server'],
    [418, 'unknown'],
  ])('maps %i to %s', (status, kind) => {
    expect(errorKindFromStatus(status)).toBe(kind)
  })
})

describe('toRequestError', () => {
  it('uses our own message when the server is unreachable', () => {
    const result = toRequestError(new ApiError('network', null, 'GET /devices: network error'))
    expect(result).toEqual({
      kind: 'network',
      status: null,
      message: 'Poslužitelj nije dostupan. Provjerite je li pokrenut i pokušajte ponovno.',
      fields: {},
    })
  })

  it('uses our own message for 5xx, never the technical text', () => {
    const result = toRequestError(new ApiError('server', 500, 'GET /devices: HTTP 500', 'Stack trace…'))
    expect(result.message).toBe('Na poslužitelju je došlo do pogreške. Pokušajte ponovno kasnije.')
  })

  it('shows the server message for 4xx errors', () => {
    const error = new ApiError('conflict', 409, 'DELETE /clients/1: HTTP 409', 'Klijent ima uređaje i ne može se obrisati.')
    expect(toRequestError(error).message).toBe('Klijent ima uređaje i ne može se obrisati.')
  })

  it('falls back to our message when a 4xx response has no message', () => {
    expect(toRequestError(new ApiError('notFound', 404, 'GET /devices/999: HTTP 404')).message).toBe(
      'Traženi zapis ne postoji.',
    )
  })

  it('keeps per-field validation messages as a copy', () => {
    const fields = { serialNumber: 'Uređaj s tim serijskim brojem već postoji.' }
    const result = toRequestError(new ApiError('validation', 400, 'POST /devices: HTTP 400', 'Podaci nisu ispravni.', fields))
    expect(result.fields).toEqual(fields)
    expect(result.fields).not.toBe(fields)
  })

  it('treats anything that is not an ApiError as unknown', () => {
    expect(toRequestError(new TypeError('x is undefined')).kind).toBe('unknown')
    expect(toRequestError('string thrown').kind).toBe('unknown')
  })
})
