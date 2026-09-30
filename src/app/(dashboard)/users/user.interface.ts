

export interface GetAllUsersResponse {
    id: number
  userId: number
  name: string
  email: string
  role: "admin" | "tester" | "user"
  photo: string
  profileImage: string
  createdAt: string
  updatedAt: string
  _count: Count
  assignedProjects: any[]
}

export interface Count {
  testCases: number
  assignedProjects: number
}