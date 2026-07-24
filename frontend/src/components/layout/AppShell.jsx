import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import AppIcon from "../ui/AppIcon";
import Logo from "../ui/Logo";

const links = [
    { to: "/dashboard", label: "Dashboard", icon: "dashboard" },
    { to: "/calendar", label: "Calendar", icon: "calendar" },
    { to: "/check-in", label: "Weekly Check-in", icon: "check" },
    { to: "/academic-records", label: "Academic Records", icon: "records" },
];

function navClass({ isActive }) {
    return `flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-[#4b8360] ${isActive ? "bg-[#e8f2e9] text-[#245d3c]" : "text-[#61736d] hover:bg-[#f2f5f2] hover:text-[#174635]"}`;
}

function AppShell({ children }) {
    const { logout, student, user } = useAuth();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [isSigningOut, setIsSigningOut] = useState(false);
    const navigate = useNavigate();
    const initials = `${student?.first_name?.[0] || ""}${student?.last_name?.[0] || ""}` || "ST";

    async function signOut() {
        setUserMenuOpen(false);
        setIsSigningOut(true);
        await logout();
        navigate("/", { replace: true });
    }

    return (
        <div className="min-h-screen bg-[#f7f7f3] text-[#10251e]">
            <header className="sticky top-0 z-40 border-b border-[#dde5df] bg-[#fdfcf9]/95 backdrop-blur">
                <div className="mx-auto flex h-[72px] max-w-[1440px] items-center gap-5 px-5 sm:px-7 lg:px-10">
                    <NavLink to="/dashboard" aria-label="AnimoLog dashboard" className="shrink-0 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#4b8360]">
                        <Logo />
                    </NavLink>

                    <nav aria-label="Main navigation" className="ml-auto hidden items-center gap-1 xl:flex">
                        {links.map((link) => (
                            <NavLink key={link.to} to={link.to} className={navClass}>
                                <AppIcon name={link.icon} className="size-[18px]" />
                                {link.label}
                            </NavLink>
                        ))}
                    </nav>

                    <div className="relative ml-auto xl:ml-2">
                        <button type="button" aria-expanded={userMenuOpen} onClick={() => setUserMenuOpen((open) => !open)} className="flex items-center gap-2 rounded-xl p-1.5 pr-2 text-left transition hover:bg-[#f0f4f0] focus-visible:outline-2 focus-visible:outline-[#4b8360]">
                            <span className="grid size-9 place-items-center rounded-full bg-[#dcecdf] text-xs font-bold text-[#285f3e]">{initials}</span>
                            <span className="hidden text-sm font-semibold text-[#234638] sm:block">{student?.first_name}</span>
                            <AppIcon name="chevronDown" className="hidden size-4 text-[#718078] sm:block" />
                        </button>
                        {userMenuOpen && (
                            <div className="absolute right-0 top-[calc(100%+10px)] w-64 overflow-hidden rounded-2xl border border-[#dfe6e1] bg-white p-2 shadow-[0_16px_44px_rgba(20,48,37,0.15)]">
                                <div className="border-b border-[#edf0ed] px-3 py-2.5">
                                    <p className="text-sm font-semibold text-[#173e30]">{student?.first_name} {student?.last_name}</p>
                                    <p className="mt-0.5 truncate text-xs text-[#73817c]">{user?.email}</p>
                                </div>
                                <button type="button" onClick={() => { setUserMenuOpen(false); navigate("/settings"); }} className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-[#546861] hover:bg-[#f2f6f2]">
                                    <AppIcon name="settings" className="size-4" /> Settings
                                </button>
                                <button type="button" onClick={signOut} disabled={isSigningOut} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-[#a24c45] hover:bg-[#fff1ef] disabled:cursor-wait disabled:opacity-60">
                                    <AppIcon name="logout" className="size-4" /> {isSigningOut ? "Signing out…" : "Sign out"}
                                </button>
                            </div>
                        )}
                    </div>

                    <button type="button" aria-label={mobileOpen ? "Close navigation" : "Open navigation"} aria-expanded={mobileOpen} onClick={() => setMobileOpen((open) => !open)} className="grid size-10 place-items-center rounded-xl text-[#345b49] hover:bg-[#eef3ef] focus-visible:outline-2 focus-visible:outline-[#4b8360] xl:hidden">
                        <AppIcon name={mobileOpen ? "close" : "menu"} />
                    </button>
                </div>

                {mobileOpen && (
                    <nav aria-label="Mobile navigation" className="border-t border-[#e5ebe6] bg-[#fdfcf9] px-5 py-3 xl:hidden">
                        <div className="mx-auto grid max-w-[900px] gap-1 sm:grid-cols-2">
                            {links.map((link) => (
                                <NavLink key={link.to} to={link.to} className={navClass} onClick={() => setMobileOpen(false)}>
                                    <AppIcon name={link.icon} className="size-[18px]" />
                                    {link.label}
                                </NavLink>
                            ))}
                        </div>
                    </nav>
                )}
            </header>

            <main className="mx-auto w-full max-w-[1360px] px-5 py-8 sm:px-7 sm:py-10 lg:px-10 lg:py-12">
                {children}
            </main>
        </div>
    );
}

export default AppShell;
