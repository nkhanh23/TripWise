import { useParams } from "react-router-dom";
import { TripResultPage } from "@/components/trips/TripResultPage";
import { TripNotFoundPage } from "@/components/system/TripNotFoundPage";

export function TripDetailPage() {
  const { tripId } = useParams<{ tripId: string }>();

  if (!tripId) {
    return <TripNotFoundPage />;
  }

  return <TripResultPage tripId={tripId} />;
}
