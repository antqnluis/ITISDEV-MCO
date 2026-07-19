import CenteredAuthLayout from "../components/layout/CenteredAuthLayout";
import PageHeader from "../components/ui/PageHeader";
import WellnessCard from "../components/ui/WellnessCard";
import MetricCard from "../components/ui/MetricCard";

function Dashboard() {
  const metrics = [
    {
      title: "Academic Engagement",
      value: "87%",
      badge: "Good",
      description: "Attendance and participation are both strong this week.",
    },
    {
      title: "Stress Level",
      value: "4.2 / 10",
      badge: "Moderate",
      description: "Slightly elevated — midterms may be a factor.",
    },
    {
      title: "Sleep",
      value: "6.8 hrs",
      badge: "Moderate",
      description: "Just under the recommended range. A consistent bedtime can help.",
    },
    {
      title: "Role Load",
      value: "3 roles",
      badge: "Moderate",
      description: "Balancing coursework, a part-time job, and a student club this week.",
    },
  ];

  return (
    <CenteredAuthLayout>
      <div className="w-full max-w-[1100px]">
        <div className="text-center">
          <PageHeader
            title="Good afternoon, Pauline."
            subtitle="Here's how you're doing this week."
            className="text-center"
          />
        </div>

        <div className="mb-8">
          <WellnessCard
            score={82}
            status="Thriving"
            description={
              "Your engagement, sleep, and stress levels are all trending positively. Keep up the gentle momentum — small habits add up."
            }
          />
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((m) => (
            <MetricCard key={m.title} title={m.title} value={m.value} badge={m.badge}>
              {m.description}
            </MetricCard>
          ))}
        </div>
      </div>
    </CenteredAuthLayout>
  );
}

export default Dashboard;
