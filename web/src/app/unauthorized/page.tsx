import { UnauthorizedPage } from "@/components/system/UnauthorizedPage";

export const metadata = {
  title: "401 Unauthorized - TripWise",
  description: "Yêu cầu đăng nhập tài khoản Explorer.",
};

export default function Page() {
  return <UnauthorizedPage />;
}
