import ResetCodesClient from "./ResetCodesClient";
export type { ResetCodeRecord } from "./ResetCodesClient";

export const fetchCache = "force-cache";

export default function AdminResetCodesPage() {
  return <ResetCodesClient />;
}
