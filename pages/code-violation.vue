<template>
  <v-container v-if="store.isAuthenticated">
    <AdminTable :user="user" />
  </v-container>
</template>

<script setup>
import AdminTable from '~/components/AdminTable.vue'
import { useUserStore } from '~/stores/user'

const store = useUserStore()
const user = store.$state
</script>
