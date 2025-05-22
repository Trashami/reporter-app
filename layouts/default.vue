<template>
  <v-app>
    <HeaderBar />
    <v-main class="bg-grey-lighten-4">
      <NuxtPage />
    </v-main>
    <FooterBar />
  </v-app>
</template>

<script setup>
import HeaderBar from '@/components/HeaderBar.vue'
import FooterBar from '@/components/FooterBar.vue'
</script>
