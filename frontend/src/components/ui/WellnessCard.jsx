function WellnessCard({ score = 82, status = 'Thriving', title = "You're in a great place this week.", description }) {
  return (
    <section className="rounded-[18px] bg-[#e6f4ea] p-8 shadow-[0_6px_18px_rgba(16,37,30,0.06)]">
      <div className="flex items-center gap-8">
        <div className="flex items-center justify-center w-36 h-36 rounded-full bg-white shadow-[inset_0_2px_0_rgba(0,0,0,0.02)]">
          <div className="flex flex-col items-center justify-center w-28 h-28 rounded-full bg-[#f6fbf7]">
            <span className="text-3xl font-semibold text-[#163d2f]">{score}</span>
            <span className="text-xs text-[#2f6b4f] mt-1">{status}</span>
          </div>
        </div>

        <div className="flex-1 text-left">
          <div className="text-xs uppercase text-[#2f6b4f] font-semibold tracking-wide">Student Wellness Index</div>
          <h3 className="mt-3 text-2xl font-serif font-semibold text-[#10251e]">{title}</h3>
          {description && <p className="mt-4 text-[#59706a]">{description}</p>}
        </div>
      </div>
    </section>
  );
}

export default WellnessCard;
