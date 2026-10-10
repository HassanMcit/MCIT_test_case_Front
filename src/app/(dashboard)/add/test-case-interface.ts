import * as zod from "zod";
import { TestCaseSchema } from "./test-case.zod";


export type TestCaseFormValues = zod.input<typeof TestCaseSchema>;

export interface AddTestCaseResponse {
  id: number
  testId: string
  module: string
  pageName: string
  scenario: string
  preConditions: string
  steps: string[]
  expectedResult: string
  actualResult: string
  priority: string
  status: string
  notes: string
  executedAt: string
  testerId: number
  projectId: number
  createdAt: string
  updatedAt: string
  userId: number
  tester: Tester
  project: Project
  message: string
  error: string
  statusCode: string
}

export interface Tester {
  id: number
  userId: number
  name: string
  email: string
}

export interface Project {
  id: number
  name: string
}
