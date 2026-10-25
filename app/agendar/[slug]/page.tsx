import Booking from "@/components/Booking";
import { notFound } from "next/navigation";
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (slug !== "studio-da-navalha") notFound();
  return <Booking />;
}
