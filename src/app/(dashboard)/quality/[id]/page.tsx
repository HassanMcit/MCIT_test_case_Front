import { notFound } from "next/navigation";
import { getQualityAppById } from "../quality.action";
import AppDetailClient from "./AppDetailClient";
import QualityComingSoon from "../QualityComingSoon";
import { getCurrentUserSession } from "@/app/myUtil";

interface AppDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function AppDetailPage({ params }: AppDetailPageProps) {
  const session = await getCurrentUserSession();
  const email = (session?.email || "").toLowerCase().trim();
  const isAuthorized = email === "h.ali@mcit.gov.eg";

  if (!isAuthorized) {
    return <QualityComingSoon />;
  }

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
