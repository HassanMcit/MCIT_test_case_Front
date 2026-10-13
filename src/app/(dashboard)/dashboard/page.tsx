import { getDashboardFullData } from "./dashboard.action";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const data = await getDashboardFullData();
  return <DashboardClient data={data} />;
}
