import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { initMsalInstance } from '@/auth/msalInstance'
import { useUserStore } from '~/stores/user' 

export const useAuth = () => {
  const store = useUserStore()
const { 
  name, 
  email, 
  photo, 
  isAuthenticated, 
  jobTitle,
  department,
  officeLocation,
  mobilePhone,
  userPrincipalName
} = storeToRefs(store)


  const router = useRouter()

  const logout = async () => {
    const msalInstance = await initMsalInstance()
    if (msalInstance) {
      await msalInstance.logoutPopup()
    }


    store.logout()
    await router.push('/login')

  }

  const login = async () => {
  const msalInstance = await initMsalInstance()
  try {
    const loginResponse = await msalInstance.loginPopup()
    const account = loginResponse.account
    const claims = loginResponse.idTokenClaims as any

    // Map MSAL account -> Pinia UserState
    store.login({
      name: account?.name || '',
      email: account?.username || '',
      photo: '', // If you want, call Microsoft Graph to get photo
      token: loginResponse.idToken, // or accessToken if you request it
      jobTitle: claims?.jobTitle || '',
      department: claims?.department || '',
      officeLocation: claims?.officeLocation || '',
      mobilePhone: claims?.mobilePhone || '',
      userPrincipalName: account?.username || ''
    })

    router.push('/') // or '/reports'
  } catch (err) {
    console.error('Login failed', err)
  }
}


  return {
    name,
    email,
    photo,
    isAuthenticated,
    logout,
    login,
    jobTitle,
    department,
    officeLocation,
    mobilePhone,
    userPrincipalName
  }
}
