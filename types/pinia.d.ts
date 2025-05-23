import 'pinia'
import type { PersistedStateOptions } from 'pinia-plugin-persistedstate-2'

declare module 'pinia' {
  export interface DefineStoreOptionsBase<S, Store> {
    persist?: boolean | PersistedStateOptions
  }
}