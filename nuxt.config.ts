import vuetify from 'vite-plugin-vuetify'

export default defineNuxtConfig({
  css: [
    'vuetify/styles',
    '@mdi/font/css/materialdesignicons.css',
  ],

  build: {
    transpile: [
      'vuetify',
      '@arcgis/core'
    ],
  },

  modules: [
    '@pinia/nuxt',
    async (_options, nuxt) => {
      nuxt.hooks.hook('vite:extendConfig', (config) => {
        config.plugins?.push(vuetify({ autoImport: true }))
      })
    },
  ],

  compatibilityDate: '2025-04-22',
})
