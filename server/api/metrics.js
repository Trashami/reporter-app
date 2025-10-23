export default defineEventHandler(async (event) => {
  try {
    // ✅ Drupal endpoint inside IDE
    const res = await fetch('https://67dfda92-ef39-4d81-b581-1dcfc4c805e7.web.ahdev.cloud/api/site-metrics', {
      headers: {
        'x-api-key': process.env.TULARE_METRICS_KEY || '3dsZYcz7KEldXRCaUkI9DI2PMHN4XB1J',
      },
    })

    if (res.status >= 300 && res.status < 400) {
      const redirect = res.headers.get('location')
      console.warn(`Redirected to ${redirect}`)
      return { error: 'Acquia IDE redirected this request to login (Okta wall)' }
    }

    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)

    const data = await res.json()
    return data
  } catch (err) {
    console.error('Error fetching site metrics:', err)
    return { error: 'Failed to fetch metrics', details: err.message }
  }
})
