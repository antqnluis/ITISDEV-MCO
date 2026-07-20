import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "../pages/Login";
import Register from "../pages/Register";
import Consent from "../pages/Consent";
import Dashboard from "../pages/Dashboard";
import Onboarding from "../pages/Onboarding";
import WeeklyCheckIn from "../pages/WeeklyCheckIn";

function AppRouter() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/consent" element={<Consent />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/weekly-check-in" element={<WeeklyCheckIn />} />
            </Routes>
        </BrowserRouter>
    );
}

export default AppRouter;
