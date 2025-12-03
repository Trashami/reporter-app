import { defineStore } from "pinia";

// Tiny global brain for filters: which sites we're looking at
// and which poor user email we’re interrogating today.
export const useFilterStore = defineStore("filters", {
  state: () => ({
    // Array of site keys like ["county", "animal", "hhsa"]
    // Starts empty because commitment is hard.
    selectedSites: [] as string[],

    // The user email to search for. Starts blank, like our will to live at 8am.
    selectedUserEmail: "",
  }),

  actions: {
    // Set which sites we care about right now.
    // This is the "I choose *you* to suffer my queries" function.
    setSites(sites: string[]) {
      this.selectedSites = sites;
    },

    // Update the currently targeted user email.
    // Single source of truth for “who are we stalking professionally?”
    setUser(email: string) {
      this.selectedUserEmail = email;
    },

    // Wipe everything back to factory settings.
    // Great for “I’ve made too many choices and regret all of them”.
    resetFilters() {
      this.selectedSites = [];
      this.selectedUserEmail = "";
    },
  },
});
