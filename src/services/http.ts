import type { ApiErrorBody } from '../types/api'
import { ApiError } from './apiError'
import { errorKindFromStatus } from '../logic/errors'

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

interface RequestOptions {
  method?: Method
  body?: unknown
  params?: URLSearchParams
}

const baseUrl = (): string => {
  const url = import.meta.env.VITE_API_URL
  if (!url) throw new Error('VITE_API_URL nije postavljen. Kopirajte .env.example u .env.')
  return url.replace(/\/$/, '')
}

const isErrorBody = (data: unknown): data is ApiErrorBody =>
  typeof data === 'object' && data !== null && typeof (data as ApiErrorBody).message === 'string'

const readJson = async (response: Response): Promise<unknown> => {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export async function request<T>(
  path: string,
  { method = 'GET', body, params }: RequestOptions = {},
): Promise<T> {
  const query = params?.toString()
  const url = `${baseUrl()}${path}${query ? `?${query}` : ''}`

  let response: Response
  try {
    response = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch (cause) {
    console.error(`[http] ${method} ${url} – nema odgovora poslužitelja`, cause)
    throw new ApiError('network', null, `${method} ${url}: network error`)
  }

  const data = await readJson(response)

  if (!response.ok) {
    console.error(`[http] ${method} ${url} → ${response.status}`, data)
    throw new ApiError(
      errorKindFromStatus(response.status),
      response.status,
      `${method} ${url}: HTTP ${response.status}`,
      isErrorBody(data) ? data.message : null,
      isErrorBody(data) ? (data.fields ?? {}) : {},
    )
  }

  return data as T
}
