function DashboardPageHeader({ eyebrow, title, description, actions }) {
    return (
        <header className="mb-8 flex flex-col gap-5 sm:mb-10 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
                {eyebrow && <p className="mb-2 text-xs font-bold uppercase tracking-[0.15em] text-[#4b8360]">{eyebrow}</p>}
                <h1 className="font-serif text-[34px] font-semibold leading-[1.08] tracking-[-0.035em] text-[#10251e] sm:text-[42px]">{title}</h1>
                {description && <p className="mt-3 max-w-2xl text-base leading-7 text-[#667972]">{description}</p>}
            </div>
            {actions && <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div>}
        </header>
    );
}

export default DashboardPageHeader;
