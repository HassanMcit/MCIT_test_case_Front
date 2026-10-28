import { redirect } from "next/navigation";

export const fetchCache = "force-cache";
export const unstable_dynamicStaleTime = 600;

export default function UserAssignProjectsRedirect() {
  redirect("/assign-projects");
}
