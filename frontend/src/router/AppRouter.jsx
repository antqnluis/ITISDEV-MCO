import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";

import Login from "../pages/Login";
import Register from "../pages/Register";
import Consent from "../pages/Consent";
import Dashboard from "../pages/Dashboard";
import Onboarding from "../pages/Onboarding";
import Calendar from "../pages/Calendar";
import WeeklyCheckIn from "../pages/WeeklyCheckIn";
import AcademicRecords from "../pages/AcademicRecords";
import Settings from "../pages/Settings";

function AppRouter() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/consent" element={<Consent />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/calendar" element={<Calendar />} />
                <Route path="/check-in" element={<WeeklyCheckIn />} />
                <Route path="/weekly-check-in" element={<Navigate to="/check-in" replace />} />
                <Route path="/academic-records" element={<AcademicRecords />} />
                <Route path="/settings" element={<Settings />} />
            </Routes>
        </BrowserRouter>
    );
}

export default AppRouter;
