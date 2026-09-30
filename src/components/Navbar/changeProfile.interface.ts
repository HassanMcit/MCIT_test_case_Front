export interface ChangeProfileResponseType {
  message: string
  photo?: string
  user: User
}

export interface User {
  id: number
  name: string
  email: string
  role: string
  photo: string
  createdAt: string
  _count: Count
  assignedProjects: any[]
}

export interface Count {
  testCases: number
  assignedProjects: number
}


export interface UserDataResponse {
  id: number
  name: string
  email: string
  role: string
  photo: string
  createdAt: string
}
