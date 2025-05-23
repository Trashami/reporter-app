import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { initMsalInstance } from '@/auth/msalInstance'
import { useUserStore } from '~/stores/user' 

export const useAuth = () => {
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

  return {
    name,
    email,
    photo,
    isAuthenticated,
    logout
  }
}
