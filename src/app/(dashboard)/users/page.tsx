import { getAllUsers } from "./user.action";
import UsersClient from "./UsersClient";


export default async function UsersManagementPage() {
  const initialUsers = await getAllUsers().catch(() => []);
  return <UsersClient initialUsers={initialUsers} />;
}
