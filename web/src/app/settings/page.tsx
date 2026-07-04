import { SettingsPage } from "@/components/settings/SettingsPage";
import { AppLayout } from "@/components/layout/AppLayout";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cài đặt tài khoản - TripWise",
  description: "Quản lý thiết lập và cấu hình tài khoản TripWise",
};

export default function Page() {
  return (
    <AppLayout>
      <SettingsPage />
    </AppLayout>
  );
}
