import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { StatCard } from "@/components/dashboard/StatCard";
import { FunnelChart } from "@/components/dashboard/FunnelChart";
import { RecentActivityFeed } from "@/components/dashboard/RecentActivityFeed";
import { FollowUpTracker } from "@/components/dashboard/FollowUpTracker";
import { getDashboardStats } from "@/lib/dashboard";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const stats = await getDashboardStats(userId);

  return (
    <main className="min-h-screen px-6 pb-20 pt-28 sm:px-8 sm:pt-32">
      <Container>
        <h1 className="text-3xl font-semibold tracking-tight text-fg">Dashboard</h1>
        <p className="mt-2 text-fg-muted">Your job search, at a glance.</p>

        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard
            label="Total Applications"
            value={stats.totalApplications}
            sublabel={`${stats.totalApplicationsThisMonth} this month`}
          />
          <StatCard label="Active Interviews" value={stats.activeInterviews} />
          <StatCard label="Response Rate" value={`${stats.responseRate}%`} />
          <StatCard label="Offers Received" value={stats.offersReceived} />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-border-strong bg-bg-elevated/70 backdrop-blur-md p-6">
            <h2 className="text-lg font-semibold text-fg">Recent Activity</h2>
            <div className="mt-4">
              <RecentActivityFeed items={stats.recentActivity} />
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-border-strong bg-bg-elevated/70 backdrop-blur-md p-6">
              <h2 className="text-lg font-semibold text-fg">Pipeline</h2>
              <div className="mt-4">
                <FunnelChart funnel={stats.funnel} />
              </div>
            </div>

            <div className="rounded-2xl border border-border-strong bg-bg-elevated/70 backdrop-blur-md p-6">
              <h2 className="text-lg font-semibold text-fg">Follow-Ups</h2>
              <div className="mt-4">
                <FollowUpTracker items={stats.followUps} />
              </div>
            </div>
          </div>
        </div>
      </Container>
    </main>
  );
}
