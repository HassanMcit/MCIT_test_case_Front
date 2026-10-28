import ResetCodesClient from "./ResetCodesClient";
export type { ResetCodeRecord } from "./ResetCodesClient";

export const fetchCache = "force-cache";
export const unstable_dynamicStaleTime = 600;

export default function AdminResetCodesPage() {
  return <ResetCodesClient />;
}
