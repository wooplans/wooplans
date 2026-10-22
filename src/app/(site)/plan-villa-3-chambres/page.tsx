import { LandingView, landingMetadata } from "../catalogue/landing";

export const dynamic = "force-dynamic";

export const metadata = landingMetadata("/plan-villa-3-chambres");

export default function Page() {
  return <LandingView path="/plan-villa-3-chambres" />;
}
