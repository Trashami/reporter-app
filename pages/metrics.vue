<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useDrupalUsers } from '~/composables/useDrupalUsers'



const users = ref<any[]>([])
const error = ref('')
const loading = ref(true)
const lastPulled = ref('Never')

async function refreshDatabase() {
  try {
    const res = await $fetch('/api/download-db')
    lastPulled.value = new Date(res.lastPulled).toLocaleString()
  } catch (err) {
    console.error(err)
    error.value = 'Failed to refresh database.'
  }
}

onMounted(async () => {
  try {
    const data = await useDrupalUsers()
    users.value = data
  } catch (err) {
    console.error(err)
    error.value = 'Failed to load Drupal users.'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <v-btn color="primary" class="mb-4" @click="refreshDatabase">
    Refresh Local Database
  </v-btn>

  <p>Last pulled: {{ lastPulled }}</p>

  <v-container class="py-10">
    <h1 class="text-h5 font-weight-bold mb-4 text-[#124216]">Site Metrics</h1>

    <v-alert v-if="error" type="error" class="mb-4">{{ error }}</v-alert>

    <v-progress-circular
      v-if="loading"
      indeterminate
      color="#124216"
      class="my-8"
    />

    <v-card v-if="!loading && !error" class="pa-6">
      <p><strong>Total Users:</strong> {{ users.length }}</p>
      <v-divider class="my-4"></v-divider>

      <v-table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Department</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in users" :key="u.email">
            <td>{{ u.name }}</td>
            <td>{{ u.email }}</td>
            <td>{{ u.department }}</td>
          </tr>
        </tbody>
      </v-table>
    </v-card>
  </v-container>
</template>
