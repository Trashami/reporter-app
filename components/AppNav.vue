   <template >
   <v-toolbar color="white" height="40" flat dense style="margin-top: 50px; border-bottom: 1px solid #ccc;">
      <v-container class="pa-0" style="max-width: 1260px;">
        <v-row class="ma-0" align="center" no-gutters>
          <v-col cols="auto">
            <v-btn to="/form" nuxt exact :ripple="false" variant="text" elevation="0" rounded="0"
              class="text-subtitle-2 font-weight-medium text-[#124216] px-4"
              style="min-height: 40px; border-radius: 0 !important;" exact-active-class="active-tab">
              Road Hazards
            </v-btn>
          </v-col>

          <v-col cols="auto" v-if="isAuthenticated">
            <v-btn to="/admin" nuxt exact :ripple="false" variant="text" elevation="0" rounded="1"
              class="text-subtitle-2 font-weight-medium text-[#124216] px-4"
              style="min-height: 40px; border-radius: 0 !important;" exact-active-class="active-tab">
              Code Violations
            </v-btn>
          </v-col>
            <v-col cols="auto">
                <v-btn to="/map" nuxt exact :ripple="false" variant="text" elevation="0" rounded="1"
                class="text-subtitle-2 font-weight-medium text-[#124216] px-4"
                style="min-height: 40px; border-radius: 0 !important;" exact-active-class="active-tab">
                Maps
                </v-btn>
                </v-col>
        </v-row>
      </v-container>
    </v-toolbar>
</template >

<script setup>
import { useAuth } from '@/composables/useAuth'

const { name, email, photo, isAuthenticated, logout } = useAuth()
</script>   