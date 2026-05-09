import { SkeletonPage } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div style={{ padding: "2rem", maxWidth: 720 }}>
      <SkeletonPage />
    </div>
  );
}
