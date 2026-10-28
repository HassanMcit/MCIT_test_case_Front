import ChangePasswordClient from "./ChangePasswordClient";

export const fetchCache = "force-cache";
export const unstable_dynamicStaleTime = 600;

export default function ChangePasswordPage() {
  return <ChangePasswordClient />;
}
