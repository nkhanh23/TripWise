import { TripResultPage } from "@/components/trips/TripResultPage";

type TripDetailRouteProps = {
  params: Promise<{
    tripId: string;
  }>;
};

export default async function TripDetailRoute({ params }: TripDetailRouteProps) {
  const { tripId } = await params;

  return <TripResultPage tripId={tripId} />;
}
