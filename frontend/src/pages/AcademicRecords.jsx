import AppShell from "../components/layout/AppShell";
import OnProgressPlaceholder from "../components/ui/InProgressPlaceholder";

function AcademicRecords() {
  return (
    <AppShell>
      <OnProgressPlaceholder pageName="Academic Records" icon="records" />
    </AppShell>
  );
}

export default AcademicRecords;
