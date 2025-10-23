import https from 'https'
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  const url = 'https://training.tcweb.acsitefactory.com/jsonapi/user/user'

  try {
    // 👇 This agent ignores hostname/cert mismatch in dev mode
    const agent = new https.Agent({
      rejectUnauthorized: false,
    })

    const res = await $fetch(url, {
      headers: {
        Authorization: 'Basic ' + btoa(`${config.drupalUser}:${config.drupalPass}`),
      },
      agent,
    })

    return res
  } catch (err: any) {
    console.error('[drupal-users] Failed:', err)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch users from Drupal.',
    })
  }
})
