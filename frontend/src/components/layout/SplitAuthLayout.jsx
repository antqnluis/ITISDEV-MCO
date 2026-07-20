import Logo from "../ui/Logo";

function AcademicBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="auth-academic-grid absolute inset-0 opacity-45" />

      <div className="absolute -right-24 top-[12%] h-[64%] w-[78%] rounded-t-[999px] border border-[#edf1d8]/13" />
      <div className="absolute -right-10 top-[20%] h-[56%] w-[61%] rounded-t-[999px] border border-[#edf1d8]/18" />
      <div className="absolute right-[8%] top-[29%] h-[47%] w-[42%] rounded-t-[999px] border border-[#edf1d8]/14 bg-white/[0.025]" />

      <div className="absolute left-[10%] top-[23%] size-2 rounded-full bg-[#e5ddb9]/55" />
      <div className="absolute left-[10%] top-[23%] h-px w-28 bg-gradient-to-r from-[#e5ddb9]/45 to-transparent" />
      <div className="absolute -left-32 bottom-[8%] size-80 rounded-full border border-white/[0.06]" />
      <div className="absolute -left-20 bottom-[13%] size-56 rounded-full border border-white/[0.06]" />
    </div>
  );
}

function SplitAuthLayout({ children }) {
  return (
    <main className="min-h-screen bg-canvas lg:grid lg:grid-cols-[minmax(400px,44%)_1fr]">
      <aside className="auth-ambient-panel relative hidden min-h-screen overflow-hidden p-9 text-white lg:grid lg:grid-rows-[auto_minmax(5rem,1fr)_auto] lg:gap-8 xl:p-10">
        <AcademicBackdrop />

        <div className="relative z-[1]">
          <Logo inverse />
        </div>

        <div aria-hidden="true" />

        <div className="relative z-[1] max-w-[455px] pb-2">
          <p className="mb-4 flex items-center gap-3 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-[#e9e5cb]/65">
            <span className="h-px w-8 bg-[#e9e5cb]/35" />
            A steadier week starts here
          </p>
          <h2 className="max-w-[430px] font-display text-[2.3rem] font-semibold leading-[1.06] tracking-[-0.035em] text-[#fffdf4] xl:text-[2.8rem]">
            Pause. Reflect. Find your balance.
          </h2>
          <p className="mt-5 max-w-[390px] text-sm leading-6 text-white/68 xl:text-base">
            A private space to make sense of your workload, wellbeing, and week.
          </p>
        </div>
      </aside>

      <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-7 sm:px-10 sm:py-12 lg:px-14 xl:px-20">
        <div aria-hidden="true" className="pointer-events-none absolute -right-32 -top-36 size-96 rounded-full bg-brand-soft/55 blur-3xl lg:hidden" />
        <div className="relative w-full max-w-[500px]">
          <div className="mb-10 lg:hidden">
            <Logo />
          </div>
          {children}
        </div>
      </section>
    </main>
  );
}

export default SplitAuthLayout;
