export default function RootLoading() {
  return (
    <div className="flex min-h-screen flex-col bg-[#04060A]">
      {/* Instant top tungsten loading bar on any button/route tap */}
      <div className="fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden bg-white/5">
        <div className="h-full w-1/2 animate-pulse bg-gradient-to-r from-transparent via-[#E8A849] to-[#FFF0C4]" />
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-3 px-4 py-20">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#E8A849]/25 border-t-[#E8A849]" />
        <p className="font-mono text-[10.5px] tracking-[0.28em] text-[#8E98AA] uppercase">
          Loading...
        </p>
      </div>
    </div>
  );
}
