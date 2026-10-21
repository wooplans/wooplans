import { LandingView, landingMetadata } from "../catalogue/landing";

export const dynamic = "force-dynamic";

export const metadata = landingMetadata("/plan-duplex-5-chambres");

export default function Page() {
  return <LandingView path="/plan-duplex-5-chambres" />;
}
