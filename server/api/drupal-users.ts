// server/api/drupal-users.ts
import type { H3Event } from 'h3'

export default defineEventHandler(async (_event: H3Event) => {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

  const url = 'https://training.tcweb.acsitefactory.com/jsonapi/user/user'
  const auth = 'Basic ' + btoa('GeoJason:N0$@JTR0mb@rg')

  try {
    const response = await $fetch(url, {
      headers: { Authorization: auth },
      // suppress SSL cert mismatch
      // @ts-ignore
      https: { rejectUnauthorized: false },
    })
    return response
  } catch (error) {
    console.error('Failed to fetch users from Drupal:', error)
    // @ts-ignore
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch users from Drupal.',
    })
  }
})
