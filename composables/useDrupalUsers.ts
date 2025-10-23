interface DrupalUser {
  id: string
  name: string
  email: string
  role: string
}

export async function useDrupalUsers(): Promise<DrupalUser[]> {
  try {
    const data = await $fetch<any>('/api/drupal-users')

    if (!data?.data) {
      console.warn('No user data returned from Drupal.')
      return []
    }

    return data.data.map((u: any) => ({
      id: u.id,
      name: u.attributes.display_name || u.attributes.name,
      email: u.attributes.mail,
      role:
        u.relationships?.roles?.data
          ?.map((r: any) => r.id)
          .join(', ') || 'N/A',
    }))
  } catch (err) {
    console.error('Drupal user fetch failed:', err)
    return []
  }
}
