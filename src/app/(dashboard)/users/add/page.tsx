import AddUserClient from "./AddUserClient";

export const fetchCache = "force-cache";
export const unstable_dynamicStaleTime = 600;

export default function AddUserPage() {
  return <AddUserClient />;
}
