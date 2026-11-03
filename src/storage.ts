export const storage = {
  localStorage: {
    get: (key: string): any | undefined => {
      const item = localStorage.getItem(key)
      try {
        return item ? JSON.parse(item) : undefined
      } catch (error) {
        return {}
      }
    },
    set: (key: string, value: any) => localStorage.setItem(key, JSON.stringify(value)),
    delete: (key: string) => localStorage.removeItem(key),
    clear: () => localStorage.clear(),
  },
  cookie: {
    get: (key: string) => {
      const value = document.cookie.match('(^|;)?' + key + '=([^;]*)(;|$)')
      return value ? decodeURI(value[2]!) : undefined
    },
    set: (key: string, value: string) => (document.cookie = key + '=' + value),
    clear: () => {
      const cookies = document.cookie.split(';')
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i]
        if (!cookie) continue
        const eqPos = cookie.indexOf('=')
        const name = eqPos > -1 ? cookie.slice(0, eqPos) : cookie
        document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT'
      }
    },
  },
}
