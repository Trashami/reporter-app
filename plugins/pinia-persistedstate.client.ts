
import { defineNuxtPlugin } from '#app'
import { createPersistedStatePlugin } from 'pinia-plugin-persistedstate-2'
import type { Pinia } from 'pinia'

export default defineNuxtPlugin((nuxtApp) => {
  const plugin = createPersistedStatePlugin()
  

  const pinia = nuxtApp.$pinia as Pinia
  pinia.use(plugin)
})
