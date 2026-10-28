import { redirect } from "next/navigation";

export const fetchCache = "force-cache";

export default function RootPage() {
  redirect("/dashboard");
}
