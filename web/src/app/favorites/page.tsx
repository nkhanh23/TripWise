import { FavoritesPlacesPage } from "@/components/favorites/FavoritesPlacesPage";
import { AppLayout } from "@/components/layout/AppLayout";

export default function FavoritesRoute() {
  return (
    <AppLayout noScroll>
      <FavoritesPlacesPage />
    </AppLayout>
  );
}
