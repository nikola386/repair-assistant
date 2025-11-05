import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
      role: string
      storeId: string
    }
  }

  interface User {
    id: string
    email: string
    name?: string | null
    image?: string | null
    role: string
    storeId: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    email: string
    image?: string | null
    name?: string | null
    role: string
    storeId: string
  }
}

