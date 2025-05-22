import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
  state: () => ({
    name: '',
    email: '',
    photo: '',
    token: '',
    isAuthenticated: false
  }),
  actions: {
    login(user: any) {
      this.name = user.name
      this.email = user.email
      this.photo = user.photo
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
