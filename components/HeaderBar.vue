<template>
  <div>
    <!-- Primary Nav Bar -->
    <v-app-bar color="#124216" dense flat height="50" class="px-6">
      <v-container fluid class="pa-0">
        <v-row align="center" justify="space-between">
          <v-col cols="auto" class="d-flex align-center">
            <v-img src="/logo.png" alt="County Logo" height="32" width="32" cover class="me-2" />
            <span class="text-white font-weight-bold text-body-1">
              Tulare County
              <span class="text-grey-lighten-2 ms-4">Citizen Reporter</span>
            </span>
          </v-col>

          <v-col cols="auto" class="d-flex align-center gap-2">
            <!-- Authenticated User -->
            <template v-if="isAuthenticated">
              <v-avatar size="32" class="me-2">
                <v-img :src="photo" alt="Profile" />
              </v-avatar>
              <v-menu offset-y location="bottom end">
                <template #activator="{ props }">
                  <v-btn v-bind="props" variant="text" class="text-white text-caption no-rounded px-2"
                    style="min-height: 50px;">
                    {{ name }}
                  </v-btn>
                </template>

                <v-card min-width="280" class="pa-4">
                  <v-row no-gutters class="mb-3">
                    <v-avatar size="64" class="me-3">
                      <v-img :src="photo" alt="Profile" />
                    </v-avatar>
                    <div class="d-flex flex-column justify-center">
                      <div class="font-weight-bold">{{ name }}</div>
                      <div class="text-caption text-grey">{{ email }}</div>
                      <div class="text-caption">{{ jobTitle }}</div>
                      <div class="text-caption text-grey">{{ department }}</div>
                    </div>
                  </v-row>
                  <v-divider class="my-2" />
                  <div v-if="officeLocation || mobilePhone" class="text-caption mb-2">
                    <div v-if="officeLocation">📍 {{ officeLocation }}</div>
                    <div v-if="mobilePhone">📱 {{ mobilePhone }}</div>
                  </div>
                  <v-btn @click="logout" block color="#124216" class="text-white no-rounded">Sign Out</v-btn>
                </v-card>
              </v-menu>
            </template>

            <!-- Not logged in -->
            <template v-else>
              <v-btn @click="login" variant="text" elevation="0"
                class="no-rounded no-hover text-white text-caption px-4"
                style="min-height: 50px;">Login</v-btn>
            </template>
          </v-col>
        </v-row>
      </v-container>
    </v-app-bar>

    <!-- App (secondary) NavBar -->
    <AppNav />
  </div>
</template>

<script setup>
import AppNav from './AppNav.vue'
import { useAuth } from '@/composables/useAuth'

const { 
  name, email, photo, isAuthenticated,
  jobTitle, department, officeLocation, mobilePhone,
  login, logout
} = useAuth()
</script>

<style scoped>
.no-rounded {
  border-radius: 0 !important;
}
.no-hover:hover {
  background-color: #124216 !important;
  box-shadow: none !important;
}
</style>
