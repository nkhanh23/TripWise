"use client";

import { SomethingWentWrongPage } from "@/components/system/SomethingWentWrongPage";

type RootErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function RootError({ error, reset }: RootErrorProps) {
  // Render the custom SomethingWentWrongPage component
  return <SomethingWentWrongPage />;
}
