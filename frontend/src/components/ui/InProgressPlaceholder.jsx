import AppIcon from "./AppIcon";

function OnProgressPlaceholder({ pageName, icon }) {
  return (
    <section className="grid min-h-[calc(100vh-12rem)] place-items-center py-8">
      <div className="w-full max-w-xl rounded-[24px] border border-[#dfe7e1] bg-white px-6 py-12 text-center shadow-[0_10px_35px_rgba(22,51,40,0.06)] sm:px-10 sm:py-16">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#eaf3eb] text-[#39724e]">
          <AppIcon name={icon} className="size-7" />
        </span>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.14em] text-[#789087]">{pageName}</p>
        <h1 className="mt-2 font-serif text-3xl font-semibold tracking-[-0.025em] text-[#163d2f] sm:text-4xl">In Progress</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#667972]">
          This page is currently being developed by the team.
        </p>
      </div>
    </section>
  );
}

export default OnProgressPlaceholder;
