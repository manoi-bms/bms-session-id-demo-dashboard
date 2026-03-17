// =============================================================================
// T015 - API Contract Tests: PasteJSON Session Retrieval
// Tests the BMS session retrieval contract using MSW v2 to intercept HTTP
// requests at the network level and validate request/response contracts.
// =============================================================================

import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { beforeAll, afterAll, afterEach, describe, it, expect } from 'vitest'

import {
  retrieveBmsSession,
  extractConnectionConfig,
  extractUserInfo,
  APP_IDENTIFIER,
} from '@/services/bmsSession'
import type { BmsSessionResponse } from '@/types'

// ---------------------------------------------------------------------------
// MSW server setup
// ---------------------------------------------------------------------------

const server = setupServer()
beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SAMPLE_SESSION_ID = '02FA45D1-91EF-4D6E-B341-ED1436343807'

const successResponse: BmsSessionResponse = {
  result: {
    system_info: { version: '1.0.0.0', environment: 'production' },
    user_info: {
      name: 'Ondemand User',
      position: 'User',
      position_id: 1,
      hospital_code: '99999',
      doctor_code: '00000',
      department: 'server',
      location: 'server',
      is_hr_admin: false,
      is_director: false,
      bms_url: 'https://99999-ondemand-win.tunnel.hosxp.net',
      bms_session_port: 443,
      bms_session_code: SAMPLE_SESSION_ID,
      bms_database_name: 'bmshosxp',
      bms_database_type: 'PostgreSQL',
    },
    key_value: SAMPLE_SESSION_ID,
    expired_second: 2592000,
  },
  MessageCode: 200,
  Message: 'OK',
  RequestTime: '2026-03-17T09:32:40.446Z',
}

const expiredResponse: BmsSessionResponse = {
  MessageCode: 500,
  Message: 'Session expired or not found',
  RequestTime: '2026-03-17T09:32:40.446Z',
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('T015 - PasteJSON Session Retrieval Contract', () => {
  // -------------------------------------------------------------------------
  // Success scenario
  // -------------------------------------------------------------------------
  describe('retrieveBmsSession — success', () => {
    it('sends the correct URL with Action=GET&code= query params', async () => {
      let capturedUrl = ''

      server.use(
        http.get('https://hosxp.net/phapi/PasteJSON', ({ request }) => {
          capturedUrl = request.url
          return HttpResponse.json(successResponse)
        }),
      )

      await retrieveBmsSession('test-id')

      expect(capturedUrl).toContain('Action=GET')
      expect(capturedUrl).toContain('code=test-id')
    })

    it('returns MessageCode 200 on a valid session', async () => {
      server.use(
        http.get('https://hosxp.net/phapi/PasteJSON', () => {
          return HttpResponse.json(successResponse)
        }),
      )

      const data = await retrieveBmsSession(SAMPLE_SESSION_ID)

      expect(data.MessageCode).toBe(200)
      expect(data.Message).toBe('OK')
    })

    it('returns result.user_info with required fields (bms_url, bms_session_code, name, department, bms_database_type)', async () => {
      server.use(
        http.get('https://hosxp.net/phapi/PasteJSON', () => {
          return HttpResponse.json(successResponse)
        }),
      )

      const data = await retrieveBmsSession(SAMPLE_SESSION_ID)
      const userInfo = data.result?.user_info

      expect(userInfo).toBeDefined()
      expect(userInfo?.bms_url).toBe('https://99999-ondemand-win.tunnel.hosxp.net')
      expect(userInfo?.bms_session_code).toBe(SAMPLE_SESSION_ID)
      expect(userInfo?.name).toBe('Ondemand User')
      expect(userInfo?.department).toBe('server')
      expect(userInfo?.bms_database_type).toBe('PostgreSQL')
    })

    it('returns result.expired_second as a number', async () => {
      server.use(
        http.get('https://hosxp.net/phapi/PasteJSON', () => {
          return HttpResponse.json(successResponse)
        }),
      )

      const data = await retrieveBmsSession(SAMPLE_SESSION_ID)

      expect(data.result?.expired_second).toBeDefined()
      expect(typeof data.result?.expired_second).toBe('number')
      expect(data.result?.expired_second).toBe(2592000)
    })
  })

  // -------------------------------------------------------------------------
  // Expired session scenario
  // -------------------------------------------------------------------------
  describe('retrieveBmsSession — expired session', () => {
    it('returns MessageCode 500 for an expired session', async () => {
      server.use(
        http.get('https://hosxp.net/phapi/PasteJSON', () => {
          return HttpResponse.json(expiredResponse)
        }),
      )

      const data = await retrieveBmsSession('expired-id')

      expect(data.MessageCode).toBe(500)
      expect(data.Message).toBe('Session expired or not found')
    })
  })

  // -------------------------------------------------------------------------
  // extractConnectionConfig
  // -------------------------------------------------------------------------
  describe('extractConnectionConfig', () => {
    it('extracts apiUrl from bms_url and bearerToken from bms_session_code', () => {
      const config = extractConnectionConfig(successResponse)

      expect(config.apiUrl).toBe('https://99999-ondemand-win.tunnel.hosxp.net')
      expect(config.bearerToken).toBe(SAMPLE_SESSION_ID)
      expect(config.appIdentifier).toBe(APP_IDENTIFIER)
    })

    it('falls back to key_value when bms_session_code is missing', () => {
      const responseWithoutSessionCode: BmsSessionResponse = {
        ...successResponse,
        result: {
          ...successResponse.result,
          user_info: {
            ...successResponse.result?.user_info,
            bms_session_code: undefined,
            bms_url: 'https://test.hosxp.net',
          },
          key_value: 'FALLBACK-TOKEN-VALUE',
        },
      }

      const config = extractConnectionConfig(responseWithoutSessionCode)

      expect(config.bearerToken).toBe('FALLBACK-TOKEN-VALUE')
    })

    it('defaults databaseType to mysql', () => {
      const config = extractConnectionConfig(successResponse)

      expect(config.databaseType).toBe('mysql')
    })

    it('throws when bms_url is missing', () => {
      const noUrlResponse: BmsSessionResponse = {
        ...successResponse,
        result: {
          user_info: { bms_url: undefined },
          key_value: 'some-key',
        },
      }

      expect(() => extractConnectionConfig(noUrlResponse)).toThrow(
        'BMS API URL is missing',
      )
    })

    it('throws when bearer token is missing', () => {
      const noTokenResponse: BmsSessionResponse = {
        ...successResponse,
        result: {
          user_info: {
            bms_url: 'https://test.hosxp.net',
            bms_session_code: undefined,
          },
          key_value: undefined,
        },
      }

      expect(() => extractConnectionConfig(noTokenResponse)).toThrow(
        'Bearer token is missing',
      )
    })
  })

  // -------------------------------------------------------------------------
  // extractUserInfo
  // -------------------------------------------------------------------------
  describe('extractUserInfo', () => {
    it('maps snake_case user_info fields to camelCase UserInfo', () => {
      const userInfo = extractUserInfo(successResponse)

      expect(userInfo.name).toBe('Ondemand User')
      expect(userInfo.position).toBe('User')
      expect(userInfo.positionId).toBe(1)
      expect(userInfo.hospitalCode).toBe('99999')
      expect(userInfo.doctorCode).toBe('00000')
      expect(userInfo.department).toBe('server')
      expect(userInfo.location).toBe('server')
      expect(userInfo.isHrAdmin).toBe(false)
      expect(userInfo.isDirector).toBe(false)
    })

    it('maps is_hr_admin to isHrAdmin correctly', () => {
      const responseWithAdmin: BmsSessionResponse = {
        ...successResponse,
        result: {
          ...successResponse.result,
          user_info: {
            ...successResponse.result?.user_info,
            is_hr_admin: true,
          },
        },
      }

      const userInfo = extractUserInfo(responseWithAdmin)
      expect(userInfo.isHrAdmin).toBe(true)
    })

    it('maps is_director to isDirector correctly', () => {
      const responseWithDirector: BmsSessionResponse = {
        ...successResponse,
        result: {
          ...successResponse.result,
          user_info: {
            ...successResponse.result?.user_info,
            is_director: true,
          },
        },
      }

      const userInfo = extractUserInfo(responseWithDirector)
      expect(userInfo.isDirector).toBe(true)
    })

    it('returns defaults when user_info is missing', () => {
      const emptyResponse: BmsSessionResponse = {
        MessageCode: 200,
        Message: 'OK',
        RequestTime: '2026-03-17T09:32:40.446Z',
      }

      const userInfo = extractUserInfo(emptyResponse)

      expect(userInfo.name).toBe('')
      expect(userInfo.positionId).toBe(0)
      expect(userInfo.isHrAdmin).toBe(false)
      expect(userInfo.isDirector).toBe(false)
    })
  })
})
