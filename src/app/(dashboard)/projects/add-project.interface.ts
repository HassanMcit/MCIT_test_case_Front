export interface AddProjectResponse {
  id: number
  name: string
  description: string
  environment: string
  status: string
  createdAt: string
  updatedAt: string
  stats: Stats
  assignedUsers: any[]
  recentTestCases: any[]
}

export interface Stats {
  total: number
  passed: number
  failed: number
  pending: number
  successRate: number
}
