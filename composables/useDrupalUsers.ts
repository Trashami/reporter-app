// composables/useDrupalUsers.ts
interface DrupalUser {
  id: string
  name: string
  email: string
  role: string
}

export async function useDrupalUsers(): Promise<DrupalUser[]> {
  try {
    const response = await $fetch('/api/drupal-users')

    if (!response?.data) {
      console.warn('No user data returned from Drupal API route.')
      return []
    }

    return response.data.map((u: any) => ({
      id: u.id,
      name: u.attributes.display_name || u.attributes.name,
      email: u.attributes.mail || '',
      role:
        u.relationships?.roles?.data?.map((r: any) => r.id).join(', ') || 'N/A',
    }))
  } catch (error) {
    console.error('Failed to fetch Drupal users:', error)
    return []
  }
}
