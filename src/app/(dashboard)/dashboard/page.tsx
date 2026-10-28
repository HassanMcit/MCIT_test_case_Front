import { getDashboardFullData } from "./dashboard.action";
import DashboardClient from "./DashboardClient";

export const fetchCache = "force-cache";
export const unstable_dynamicStaleTime = 600;

export default async function DashboardPage() {
  const data = await getDashboardFullData();
  return <DashboardClient data={data} />;
}
