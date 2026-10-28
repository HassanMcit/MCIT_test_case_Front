import { getQualityApplications } from "./quality.action";
import QualityClient from "./QualityClient";

export const fetchCache = "force-cache";
export const unstable_dynamicStaleTime = 600;

interface QualityPageProps {
  searchParams: Promise<{
    category?: string;
    search?: string;
  }>;
}

export default async function QualityPage({ searchParams }: QualityPageProps) {
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
