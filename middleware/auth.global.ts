import { useUserStore } from '~/stores/user'
import { navigateTo, useNuxtApp } from '#app'

export default defineNuxtRouteMiddleware((to) => {
  const store = useUserStore()

  // Only check on client to ensure hydrated state is used
  // and avoid unnecessary server-side checks

  if (process.client && to.path === '/admin' && !store.isAuthenticated) {
    return navigateTo('/login')
  }
})