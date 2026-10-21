import { LandingView, landingMetadata } from "../catalogue/landing";

export const dynamic = "force-dynamic";

export const metadata = landingMetadata("/facade-duplex-moderne");

export default function Page() {
  return <LandingView path="/facade-duplex-moderne" />;
}
