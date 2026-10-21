import { LandingView, landingMetadata } from "../catalogue/landing";

export const dynamic = "force-dynamic";

export const metadata = landingMetadata("/petit-duplex");

export default function Page() {
  return <LandingView path="/petit-duplex" />;
}
