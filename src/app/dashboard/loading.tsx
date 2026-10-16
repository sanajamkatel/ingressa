import { Container } from "@/components/ui/Container";

function SkeletonCard({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-bg-elevated ${className}`} />;
}

export default function DashboardLoading() {
  return (
    <main className="min-h-screen px-6 pb-20 pt-28 sm:px-8 sm:pt-32">
      <Container>
        <div className="h-8 w-40 animate-pulse rounded-md bg-bg-elevated" />
        <div className="mt-2 h-4 w-56 animate-pulse rounded-md bg-bg-elevated" />

        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} className="h-24" />
          ))}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <SkeletonCard className="h-80" />
          <div className="space-y-6">
            <SkeletonCard className="h-56" />
            <SkeletonCard className="h-40" />
          </div>
        </div>
      </Container>
    </main>
  );
}
