export interface User {
  id: number
  name: string
  email: string
  role: 'admin' | 'editor' | 'viewer'
  active: boolean
}

export interface Post {
  id: number
  title: string
  userId: number
}

export interface Team {
  id: number
  name: string
}
