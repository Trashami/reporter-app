import { useUserStore } from '~/stores/user'
import { navigateTo, useNuxtApp } from '#app'

export default defineNuxtRouteMiddleware((to) => {
  const store = useUserStore()

  // If route says it requires auth AND user is not logged in → kick them out
  if (to.meta.requiresAuth && !store.isAuthenticated) {
    return navigateTo('/login')
  }
})
