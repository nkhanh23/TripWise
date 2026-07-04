import { TripPlannerPage } from "@/components/planner/TripPlannerPage";
import { AppLayout } from "@/components/layout/AppLayout";

export default function PlannerRoute() {
  return (
    <AppLayout>
      <TripPlannerPage />
    </AppLayout>
  );
}
