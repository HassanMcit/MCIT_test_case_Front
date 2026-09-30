export interface AddUserType {
  id: string;
  name: string;
  email: string;
  password: string;
  role: "user" | "admin" | "tester";
}

export type AddUserSchemaType = AddUserType;

export interface AddNewUserResponse {
  id: number;
  userId?: number;
  name: string;
  email: string;
  role: string;
  photo?: string;
  profileImage?: string;
  createdAt?: string;
  _count?: Count;
  assignedProjects?: any[];
  message?: string;
  error: string
}

export type Root = AddNewUserResponse;

export interface Count {
  testCases: number;
  assignedProjects: number;
}
