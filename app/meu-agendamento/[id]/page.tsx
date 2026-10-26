import ManageBooking from "@/components/ManageBooking";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <ManageBooking id={(await params).id} />;
}
