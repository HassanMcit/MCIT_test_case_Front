import { getQualityApplications } from "./quality.action";
import QualityClient from "./QualityClient";
import QualityComingSoon from "./QualityComingSoon";
import { getCurrentUserSession } from "@/app/myUtil";

interface QualityPageProps {
  searchParams: Promise<{
    category?: string;
    search?: string;
  }>;
}

export default async function QualityPage({ searchParams }: QualityPageProps) {
  const session = await getCurrentUserSession();
  const email = (session?.email || "").toLowerCase().trim();
  const isAuthorized = email === "h.ali@mcit.gov.eg";

  if (!isAuthorized) {
    return <QualityComingSoon />;
  }

  const resolvedSearchParams = await searchParams;
  const initialCategory = resolvedSearchParams?.category || "All";
  const initialSearch = resolvedSearchParams?.search || "";

  const data = await getQualityApplications(initialCategory, initialSearch);

  return (
    <QualityClient
      initialData={data}
      initialCategory={initialCategory}
      initialSearch={initialSearch}
    />
  );
}
