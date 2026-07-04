import { TripResultPage } from "@/components/trips/TripResultPage";
import { AppLayout } from "@/components/layout/AppLayout";

type TripDetailRouteProps = {
  params: Promise<{
    tripId: string;
  }>;
};

export default async function TripDetailRoute({ params }: TripDetailRouteProps) {
  const { tripId } = await params;

  return (
    <AppLayout>
      <TripResultPage tripId={tripId} />
    </AppLayout>
  );
}
