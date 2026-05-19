import { FunnelTracker } from "@/components/FunnelTracker";
import { WhatsAppFloat } from "@/components/WhatsAppFloat";

export default function SalesLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <FunnelTracker />
      <main>{children}</main>
      <WhatsAppFloat />
    </>
  );
}
