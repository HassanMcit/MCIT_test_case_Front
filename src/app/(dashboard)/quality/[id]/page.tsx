import { notFound } from "next/navigation";
import { getQualityAppById } from "../quality.action";
import AppDetailClient from "./AppDetailClient";

interface AppDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function AppDetailPage({ params }: AppDetailPageProps) {
  const { id } = await params;
  const appId = parseInt(id, 10);
  if (isNaN(appId)) {
    notFound();
  }

  const { application, assessments } = await getQualityAppById(appId);
  if (!application) {
    notFound();
  }

  return (
    <AppDetailClient
      initialApp={application}
      initialAssessments={assessments}
    />
  );
}
