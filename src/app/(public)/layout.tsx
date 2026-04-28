import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { FunnelTracker } from "@/components/FunnelTracker";
import { WhatsAppFloat } from "@/components/WhatsAppFloat";

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <FunnelTracker />
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <WhatsAppFloat />
    </>
  );
}
