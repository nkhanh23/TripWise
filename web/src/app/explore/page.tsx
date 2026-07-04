import { ExplorePlacesPage } from "@/components/explore/ExplorePlacesPage";
import { AppLayout } from "@/components/layout/AppLayout";

export default function ExploreRoute() {
  return (
    <AppLayout noScroll>
      <ExplorePlacesPage />
    </AppLayout>
  );
}
