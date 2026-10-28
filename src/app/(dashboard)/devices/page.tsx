import DevicesSecurityClient from "./DevicesSecurityClient";

export const fetchCache = "force-cache";
export const unstable_dynamicStaleTime = 600;

export default function DevicesSecurityPage() {
  return <DevicesSecurityClient />;
}
