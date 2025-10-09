import { defineStore } from 'pinia'

interface UserState {
  name: string
  email: string
  photo: string
  token: string
  isAuthenticated: boolean
  jobTitle: string
  department: string
  officeLocation: string
  mobilePhone: string
  userPrincipalName: string
}

export const useUserStore = defineStore('user', {
  state: (): UserState => ({
    name: '',
    email: '',
    photo: '',
    token: '',
    isAuthenticated: false,
    jobTitle: '',
    department: '',
    officeLocation: '',
    mobilePhone: '',
    userPrincipalName: ''
  }),
  actions: {
    login(user: Partial<UserState> & { token: string }) {
      this.name = user.name || ''
      this.email = user.email || ''
      this.photo = user.photo || ''
      this.token = user.token
      this.isAuthenticated = true

      // new optional fields
      this.jobTitle = user.jobTitle || ''
      this.department = user.department || ''
      this.officeLocation = user.officeLocation || ''
      this.mobilePhone = user.mobilePhone || ''
      this.userPrincipalName = user.userPrincipalName || ''
    },
    logout() {
      this.$reset()
    }
  },
  persist: true
})
