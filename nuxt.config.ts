import vuetify from 'vite-plugin-vuetify'

export default defineNuxtConfig({
  runtimeConfig: {
    // Store secrets safely
    drupalUser: process.env.DRUPAL_USER,
    drupalPass: process.env.DRUPAL_PASS,
    TULARE_METRICS_KEY: process.env.TULARE_METRICS_KEY,
  },

  css: [
    'vuetify/styles',
    '@mdi/font/css/materialdesignicons.css',
  ],

  build: {
    transpile: ['vuetify', '@arcgis/core'],
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
