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
            <!-- Authenticated User UI -->
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

                <v-card min-width="250" class="pa-4">
                  <v-row no-gutters class="mb-3">
                    <v-avatar size="64" class="me-3">
                      <v-img :src="photo" alt="Profile" />
                    </v-avatar>
                    <div class="d-flex flex-column justify-center">
                      <div class="font-weight-bold">{{ name }}</div>
                      <div class="text-caption text-grey">{{ email }}</div>
                    </div>
                  </v-row>
                  <v-divider class="my-2" />
                  <v-btn @click="logout" block color="#124216" class="text-white no-rounded">Sign Out</v-btn>
                </v-card>
              </v-menu>
            </template>

            <!-- Login Button When User Is Not Authenticated -->
            <template v-else>
              <v-btn to="/login" nuxt variant="text" elevation="0"
                class="no-rounded no-hover text-white text-caption px-4" style="min-height: 50px;">Login</v-btn>
            </template>
          </v-col>
        </v-row>
      </v-container>
    </v-app-bar>

    <!-- Secondary NavBar -->
    <v-toolbar color="white" height="40" flat dense style="margin-top: 50px; border-bottom: 1px solid #ccc;">
      <v-container class="pa-0" style="max-width: 1260px;">
        <v-row class="ma-0" align="center" no-gutters>
          <v-col cols="auto">
            <v-btn to="/road-hazard" nuxt exact :ripple="false" variant="text" elevation="0" rounded="0"
              class="text-subtitle-2 font-weight-medium text-[#124216] px-4"
              style="min-height: 40px; border-radius: 0 !important;" exact-active-class="active-tab">
              Road Hazards
            </v-btn>
          </v-col>

          <v-col cols="auto" v-if="isAuthenticated">
            <v-btn to="/code-violation" nuxt exact :ripple="false" variant="text" elevation="0" rounded="1"
              class="text-subtitle-2 font-weight-medium text-[#124216] px-4"
              style="min-height: 40px; border-radius: 0 !important;" exact-active-class="active-tab">
              Code Violations
            </v-btn>
          </v-col>

        </v-row>
      </v-container>
    </v-toolbar>
  </div>
</template>

<script setup>
import { useUserStore } from '~/stores/user'
import { useRouter } from 'vue-router'
import { initMsalInstance } from '@/auth/msalInstance'
import { storeToRefs } from 'pinia'

const store = useUserStore()
const { name, email, photo, isAuthenticated } = storeToRefs(store)

const router = useRouter()

const logout = async () => {
  const msalInstance = await initMsalInstance()
  if (msalInstance) {
    await msalInstance.logoutPopup()
  }
  store.logout()
  await router.push('/')
}
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
