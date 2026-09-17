/// <reference types="vite/client" />

interface Window {
  ferdelDesktop?: {
    platform: string
    version: string
    database: {
      load: <T>(key: string) => Promise<T | null>
      save: (key: string, value: unknown) => Promise<boolean>
    }
    updates: {
      check: () => Promise<{ development: boolean; version: string }>
      download: () => Promise<unknown>
      install: () => Promise<void>
      getVersion: () => Promise<string>
      onStatus: (callback: (data: {
        status: 'ready' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'
        version?: string
        releaseName?: string
        releaseDate?: string
        percent?: number
        message?: string
        manual?: boolean
      }) => void) => () => void
    }
    mobile: {
      getAccess: () => Promise<{ url: string; local: boolean }>
    }
  }
}
