import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { initMsalInstance } from '@/auth/msalInstance'
import { useUserStore } from '~/stores/user' 

export const useAuth = () => {
  const store = useUserStore()
  const { 
    name, email, photo, isAuthenticated,
    jobTitle, department, officeLocation,
    mobilePhone, userPrincipalName 
  } = storeToRefs(store)

  const router = useRouter()

  const fetchGraphProfile = async (accessToken: string) => {
    const headers = { Authorization: `Bearer ${accessToken}` }

    // Basic profile fields
    const userData = await fetch(
      'https://graph.microsoft.com/v1.0/me?$select=displayName,mail,jobTitle,department,officeLocation,mobilePhone,userPrincipalName',
      { headers }
    ).then(r => r.json())

    let photoUrl = ''
    const photoResp = await fetch(
      'https://graph.microsoft.com/v1.0/me/photo/$value',
      { headers }
    )

    if (photoResp.ok) {
      const blob = await photoResp.blob()
      photoUrl = URL.createObjectURL(blob)
    }

    return {
      name: userData.displayName,
      email: userData.mail,
      jobTitle: userData.jobTitle,
      department: userData.department,
      officeLocation: userData.officeLocation,
      mobilePhone: userData.mobilePhone,
      userPrincipalName: userData.userPrincipalName,
      photo: photoUrl
    }
  }

  const login = async () => {
    const msalInstance = await initMsalInstance()

    try {
      const response = await msalInstance.loginPopup()
      const account = response.account

      // Get an access token for Microsoft Graph
      const tokenResp = await msalInstance.acquireTokenSilent({
        scopes: ['User.Read'],
        account
      })

      const profile = await fetchGraphProfile(tokenResp.accessToken)

      // Save to Pinia store
      store.login({
        ...profile,
        token: response.idToken
      })

      router.push('/')
    } catch (err) {
      console.error('Login failed', err)
    }
  }

  const logout = async () => {
    const msalInstance = await initMsalInstance()
    if (msalInstance) {
      await msalInstance.logoutPopup()
    }
    store.logout()
    router.push('/login')
  }

  return {
    name, email, photo, isAuthenticated,
    jobTitle, department, officeLocation,
    mobilePhone, userPrincipalName,
    login, logout
  }
}
