// auth/msalInstance.js
import { PublicClientApplication } from '@azure/msal-browser'
import { msalConfig } from './authConfig'

let instance = null

export async function initMsalInstance() {
  if (typeof window === 'undefined') return null

  if (!instance) {
    instance = new PublicClientApplication(msalConfig)
    await instance.initialize() 
  }

  return instance
}
