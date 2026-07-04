import { Card } from "@/components/ui/Card";
import { Loading } from "@/components/ui/Loading";

export default function RootLoading() {
  return (
    <main className="page-shell" style={{ padding: "48px 0 64px" }}>
      <Card elevated>
        <Loading label="TripWise dang tai man hinh va dong bo du lieu..." />
      </Card>
    </main>
  );
}
