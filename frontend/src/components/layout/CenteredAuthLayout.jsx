import Logo from "../ui/Logo";

function CenteredAuthLayout({ children, showLogo = true }) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-canvas px-5 py-6 sm:px-8 sm:py-8 lg:px-12">
      <div aria-hidden="true" className="pointer-events-none absolute -right-28 -top-32 size-96 rounded-full bg-brand-soft/70 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-44 -left-36 size-[28rem] rounded-full bg-[#e7eee1] blur-3xl" />

      <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl flex-col sm:min-h-[calc(100vh-4rem)]">
        {showLogo && (
          <header className="mb-8 flex shrink-0 items-center justify-between sm:mb-10">
            <Logo />
          </header>
        )}
        <div className="flex flex-1 items-center justify-center py-2 sm:py-4">
          {children}
        </div>
      </div>
    </main>
  );
}

export default CenteredAuthLayout;
