import { ProfilePage } from "@/components/profile/ProfilePage";
import { AppLayout } from "@/components/layout/AppLayout";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hồ sơ cá nhân - TripWise",
  description: "Quản lý thông tin hồ sơ và sở thích du lịch cá nhân trên TripWise",
};

export default function Page() {
  return (
    <AppLayout>
      <ProfilePage />
    </AppLayout>
  );
}
