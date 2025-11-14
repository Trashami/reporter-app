// server/api/drupal-users.get.ts
import { defineEventHandler, createError } from 'h3'

export default defineEventHandler(async () => {
  const baseUrl = process.env.DRUPAL_BASE_URL || 'http://county.test-tcweb.acsitefactory.com'
  const url = `${baseUrl}/jsonapi/user/user`

  const credentials = Buffer.from(
    `${process.env.DRUPAL_USER}:${process.env.DRUPAL_PASS}`
  ).toString('base64')

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
    })

    if (!res.ok) {
      const body = await res.text()
      console.error('Drupal returned', res.status, body)
      throw new Error(`Drupal returned ${res.status}`)
    }

    const json = await res.json()

    const users = json.data.map((u: any) => ({
      id: u.id,
      name: u.attributes.display_name || u.attributes.name,
      email: u.attributes.mail,
      roles:
        u.relationships?.roles?.data?.map(
          (r: any) => r.meta?.drupal_internal__target_id
        ) || [],
    }))

    return users
  } catch (err) {
    console.error('Failed to fetch users from Drupal:', err)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch users from Drupal.',
    })
  }
})
