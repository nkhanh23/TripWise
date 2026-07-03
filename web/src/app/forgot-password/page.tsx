import { ForgotPasswordPage } from "@/components/auth/ForgotPasswordPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quên mật khẩu - TripWise",
  description: "Yêu cầu khôi phục mật khẩu tài khoản TripWise",
};

export default function Page() {
  return <ForgotPasswordPage />;
}
