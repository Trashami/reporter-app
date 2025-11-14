import vuetify from 'vite-plugin-vuetify'

export default defineNuxtConfig({
  ssr: false,
  runtimeConfig: {
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
  modules: ['@pinia/nuxt'],
  vite: {
    plugins: [vuetify({ autoImport: true })],
  },
  compatibilityDate: '2025-04-22',
})
