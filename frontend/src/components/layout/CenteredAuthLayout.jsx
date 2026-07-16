function CenteredAuthLayout({ children }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fdfcf9] px-6 py-12 sm:px-10 lg:px-16">
      {children}
    </main>
  );
}

export default CenteredAuthLayout;
