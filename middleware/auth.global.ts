import { useUserStore } from '~/stores/user'
import { navigateTo, useNuxtApp } from '#app'

export default defineNuxtRouteMiddleware((to) => {
  const store = useUserStore()

  if (process.client && to.path === '/admin' && !store.isAuthenticated) {
    return navigateTo('/login')
  }
})