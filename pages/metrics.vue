<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useDrupalUsers } from '~/composables/useDrupalUsers'

const users = ref<any[]>([])
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    users.value = await useDrupalUsers()
  } catch (err) {
    error.value = 'Could not load Drupal users.'
    console.error(err)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <v-container>
    <v-progress-circular v-if="loading" indeterminate color="primary" />
    <v-alert v-if="error" type="error">{{ error }}</v-alert>

    <v-table v-if="!loading && !error">
      <thead>
        <tr><th>Name</th><th>Email</th><th>Roles</th></tr>
      </thead>
      <tbody>
        <tr v-for="u in users" :key="u.id">
          <td>{{ u.name }}</td>
          <td>{{ u.email }}</td>
          <td>{{ u.roles.join(', ') }}</td>
        </tr>
      </tbody>
    </v-table>
  </v-container>
</template>
