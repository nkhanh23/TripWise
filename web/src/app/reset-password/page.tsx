import { ResetPasswordPage } from "@/components/auth/ResetPasswordPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Đặt lại mật khẩu - TripWise",
  description: "Đặt lại mật khẩu tài khoản TripWise",
};

export default function Page() {
  return <ResetPasswordPage />;
}
