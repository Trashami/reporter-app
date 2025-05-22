import { useUserStore } from '~/stores/user'

export default defineNuxtRouteMiddleware((to) => {
  const store = useUserStore()
  const protectedPaths = ['/code-violation'] 

  if (protectedPaths.includes(to.path) && !store.isAuthenticated) {
    return navigateTo('/login')
  }
})
