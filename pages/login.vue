<template>
  <v-container class="py-16 text-center">
    <v-card class="mx-auto px-6 py-10" max-width="500">
      <h1 class="text-h5 font-weight-bold mb-4 text-[#124216]">Sign In</h1>
      <p class="mb-6 text-body-2">
        Please sign in using your Tulare County Microsoft account.
      </p>
      <v-btn color="#124216" class="text-white no-rounded" @click="signIn">
        Sign in with Microsoft
      </v-btn>
    </v-card>
  </v-container>
</template>

<script setup>
import { initMsalInstance } from '@/auth/msalInstance'
import { loginRequest } from '@/auth/authConfig'
import { useUserStore } from '~/stores/user'
import { useRouter } from 'vue-router'

const store = useUserStore()
const router = useRouter()

// helper to convert blob → base64
const blobToBase64 = (blob) => {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result)
    reader.readAsDataURL(blob)
  })
}

const signIn = async () => {
  try {
    const msalInstance = await initMsalInstance()
    if (!msalInstance) {
      console.warn('MSAL not available')
      return
    }

    // Microsoft login
    const result = await msalInstance.loginPopup(loginRequest)
    if (!result || !result.account || !result.accessToken) {
      console.warn('Login failed: Missing account or token')
      return
    }

    const token = result.accessToken

    // Fetch user profile from Graph
    const userRes = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
    const profile = await userRes.json()

    // Fetch user photo from Graph
    let photo = ''
    try {
      const imageRes = await fetch('https://graph.microsoft.com/v1.0/me/photo/$value', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (imageRes.ok) {
        const blob = await imageRes.blob()
        photo = await blobToBase64(blob)
      }
    } catch {
      console.warn('No photo available for user')
    }

    // Hydrate Pinia store
    const userData = {
      name: profile.displayName,
      email: profile.mail || profile.userPrincipalName,
      photo,
      token,
      jobTitle: profile.jobTitle || '',
      department: profile.department || '',
      officeLocation: profile.officeLocation || '',
      mobilePhone: profile.mobilePhone || '',
      userPrincipalName: profile.userPrincipalName || ''
    }

    store.login(userData)
    await router.push('/')
  } catch (err) {
    console.error('Login failed:', err)
  }
}
</script>

<style scoped>
.no-rounded {
  border-radius: 0 !important;
}
</style>
