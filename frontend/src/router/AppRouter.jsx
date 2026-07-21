import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "../pages/Login";
import Register from "../pages/Register";
import Consent from "../pages/Consent";
import Dashboard from "../pages/Dashboard";
import Onboarding from "../pages/Onboarding";
import WeeklyCheckIn from "../pages/WeeklyCheckIn";
import AcademicRecords from "../pages/AcademicRecords";

function AppRouter() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/consent" element={<Consent />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/check-in" element={<WeeklyCheckIn />} />
                <Route path="/academic-records" element={<AcademicRecords />} />
            </Routes>
        </BrowserRouter>
    );
}

export default AppRouter;
