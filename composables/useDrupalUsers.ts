export async function useDrupalUsers() {
  return await $fetch('/api/drupal-users')
}
