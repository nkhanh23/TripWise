import { ForbiddenPage } from "@/components/system/ForbiddenPage";

export const metadata = {
  title: "403 Forbidden - TripWise",
  description: "Bạn không có quyền truy cập trang này.",
};

export default function Page() {
  return <ForbiddenPage />;
}
