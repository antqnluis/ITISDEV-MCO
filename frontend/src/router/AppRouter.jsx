import { BrowserRouter, Routes, Route } from "react-router-dom";

import {
    OnboardingOnlyRoute,
    PublicOnlyRoute,
    RequireAuth,
} from "../components/auth/AuthRouteGuards";
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
                <Route path="/" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
                <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />
                <Route path="/consent" element={<RequireAuth><Consent /></RequireAuth>} />
                <Route path="/onboarding" element={(
                    <RequireAuth requireConsent>
                        <OnboardingOnlyRoute><Onboarding /></OnboardingOnlyRoute>
                    </RequireAuth>
                )} />
                <Route path="/dashboard" element={<RequireAuth requireConsent><Dashboard /></RequireAuth>} />
                <Route path="/check-in" element={<RequireAuth requireConsent><WeeklyCheckIn /></RequireAuth>} />
                <Route path="/academic-records" element={<RequireAuth requireConsent><AcademicRecords /></RequireAuth>} />
            </Routes>
        </BrowserRouter>
    );
}

export default AppRouter;
