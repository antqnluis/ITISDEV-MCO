import AppShell from "../components/layout/AppShell";
import OnProgressPlaceholder from "../components/ui/InProgressPlaceholder";

function Dashboard() {
  return (
    <AppShell>
      <OnProgressPlaceholder pageName="Dashboard" icon="dashboard" />
    </AppShell>
  );
}

export default Dashboard;
