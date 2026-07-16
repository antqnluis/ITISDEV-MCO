import CenteredAuthLayout from "../components/layout/CenteredAuthLayout";
import PageHeader from "../components/ui/PageHeader";

function Dashboard() {
  return (
    <CenteredAuthLayout>
      <div className="w-full max-w-[720px] text-center">
        <PageHeader
          title="Dashboard"
          subtitle="Your AnimoLog dashboard will be available here."
          className="text-center"
        />
      </div>
    </CenteredAuthLayout>
  );
}

export default Dashboard;
