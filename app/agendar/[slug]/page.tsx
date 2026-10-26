import Booking from "@/components/Booking";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const shop = await db.query("SELECT id FROM tenants WHERE slug=$1", [slug]);
  if (!shop.rowCount) notFound();
  return <Booking slug={slug} />;
}
