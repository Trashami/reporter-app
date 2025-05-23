import { defineStore } from 'pinia'

interface UserState {
  name: string
  email: string
  photo: string
  token: string
  isAuthenticated: boolean
}

export const useUserStore = defineStore('user', {
  state: (): UserState => ({
    name: '',
    email: '',
    photo: '',
    token: '',
    isAuthenticated: false
  }),
  actions: {
    login(user: Partial<UserState> & { token: string }) {
      this.name = user.name || ''
      this.email = user.email || ''
      this.photo = user.photo || ''
      this.token = user.token
      this.isAuthenticated = true
    },
    logout() {
      this.name = ''
      this.email = ''
      this.photo = ''
      this.token = ''
      this.isAuthenticated = false
    }
  },
  persist: true
})
