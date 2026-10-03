export interface User {
  active: boolean
  email: string
  id: number
  name: string
  role: 'admin' | 'editor' | 'viewer'
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
