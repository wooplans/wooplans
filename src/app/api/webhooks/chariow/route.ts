import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const event = payload.event;

    if (event !== "successful.sale") {
      return NextResponse.json({ received: true });
    }

    const { sale, customer } = payload;

    if (!customer?.email) {
      console.error("No customer email in webhook payload");
      return NextResponse.json({ received: true });
    }

    const subscriber = await prisma.subscriber.findUnique({
      where: { email: customer.email },
    });

    const premiumCode = String(Math.floor(1000 + Math.random() * 9000));
    const chariowSaleId = sale?.id || null;
    const chariowLicenseKey = payload.license?.key || null;
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    if (subscriber) {
      await prisma.subscriber.update({
        where: { id: subscriber.id },
        data: {
          isActive: true,
          expiresAt,
          chariowCustomerId: chariowSaleId,
          chariowLicenseKey,
          premiumCode,
        },
      });
    } else {
      await prisma.subscriber.create({
        data: {
          email: customer.email,
          isActive: true,
          expiresAt,
          chariowCustomerId: chariowSaleId,
          chariowLicenseKey,
          premiumCode,
        },
      });
    }

    console.log(`Subscriber ${customer.email} activated with premium code (Sale: ${chariowSaleId})`);

    return NextResponse.json({ received: true, activated: true });
  } catch (error) {
    console.error("Chariow webhook processing error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ method: "POST" });
}
