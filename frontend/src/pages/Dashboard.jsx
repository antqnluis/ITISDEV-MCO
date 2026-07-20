import CenteredAuthLayout from "../components/layout/CenteredAuthLayout";
import PageHeader from "../components/ui/PageHeader";

function Dashboard() {
  return (
    <CenteredAuthLayout>
      <section className="surface-panel w-full max-w-[640px] p-8 text-center sm:p-12">
        <div className="mx-auto mb-6 grid size-14 place-items-center rounded-2xl bg-brand-soft text-brand-deep" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" className="size-7">
            <path d="M5 19V9m7 10V5m7 14v-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </div>
        <PageHeader
          compact
          title="Dashboard"
          subtitle="Your AnimoLog dashboard will be available here."
          align="center"
        />
      </section>
    </CenteredAuthLayout>
  );
}

export default Dashboard;
