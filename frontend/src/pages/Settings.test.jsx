import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../context/useAuth";
import {
    getStudentProfile,
    updateStudentProfile,
} from "../services/profileApi";
import { downloadWellnessSummaryPdf } from "../services/wellnessSummaryPdf";
import { getWellnessSummaryExport } from "../services/wellnessSummaryExportApi";
import Settings from "./Settings";

vi.mock("../context/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("../services/profileApi", () => ({
    getStudentProfile: vi.fn(),
    updateStudentProfile: vi.fn(),
}));
vi.mock("../services/wellnessSummaryPdf", () => ({
    downloadWellnessSummaryPdf: vi.fn(),
}));
vi.mock("../services/wellnessSummaryExportApi", () => ({
    getWellnessSummaryExport: vi.fn(),
}));

const authenticatedRequest = vi.fn();
const logout = vi.fn();
const updateStudentDetails = vi.fn();
const student = {
    id: "student-id",
    first_name: "Jamie",
    last_name: "Student",
    student_number: "12345678",
    consent_given: true,
    consented_at: "2026-07-01T04:00:00.000Z",
    privacy_notice_version: "v1.0",
};
const profile = {
    id: "profile-id",
    student_id: student.id,
    college: "College of Computer Studies",
    program: "BS Information Technology",
    year_level: 3,
    current_academic_term: 1,
    wellness_goals: ["Managing Stress", "Better Sleep"],
    commute_minutes_per_day: 90,
    available_study_hours_per_week: 8,
    has_caregiving_responsibility: true,
    caregiving_hours_per_week: 5,
    is_employed: true,
    work_hours_per_week: 20,
    has_ojt: false,
    ojt_hours_per_week: 0,
    is_athlete: false,
    athlete_hours_per_week: 0,
    has_organization_responsibility: true,
    organization_role: "Vice President",
    organization_hours_per_week: 8,
    additional_context: "Current academic context.",
    onboarding_completed_at: "2026-06-01T04:00:00.000Z",
    created_at: "2026-06-01T04:00:00.000Z",
    updated_at: "2026-07-01T04:00:00.000Z",
};
const wellnessSummary = {
    generated_at: "2026-07-27T04:00:00.000Z",
    student: {
        first_name: student.first_name,
        last_name: student.last_name,
        student_number: student.student_number,
        email: "student@example.com",
    },
    profile,
    check_ins: [],
    dimension_scores: [],
};

function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });
    return { promise, resolve, reject };
}

function renderPage() {
    return render(
        <MemoryRouter initialEntries={["/settings"]}>
            <Routes>
                <Route path="/settings" element={<Settings />} />
                <Route path="/" element={<p>Login destination</p>} />
            </Routes>
        </MemoryRouter>,
    );
}

beforeEach(() => {
    authenticatedRequest.mockReset();
    logout.mockReset().mockResolvedValue(undefined);
    updateStudentDetails.mockReset().mockImplementation(async (payload) => ({
        ...student,
        ...payload,
    }));
    getStudentProfile.mockReset().mockResolvedValue(profile);
    updateStudentProfile.mockReset().mockImplementation(async (_request, payload) => ({
        ...profile,
        ...payload,
        updated_at: "2026-07-27T04:00:00.000Z",
    }));
    getWellnessSummaryExport.mockReset().mockResolvedValue(wellnessSummary);
    downloadWellnessSummaryPdf.mockReset().mockResolvedValue(undefined);
    useAuth.mockReturnValue({
        authenticatedRequest,
        logout,
        student,
        updateStudentDetails,
        user: { id: student.id, email: "student@example.com" },
    });
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});

describe("Settings backend data", () => {
    it("loads persisted settings and keeps institutional identifiers read-only", async () => {
        renderPage();

        expect(screen.getByRole("status")).toHaveTextContent("Loading your settings");
        expect(await screen.findByDisplayValue("BS Information Technology"))
            .toBeInTheDocument();
        expect(screen.getByLabelText("First name")).toHaveValue("Jamie");
        expect(screen.getByLabelText("Student number")).toHaveValue("12345678");
        expect(screen.getByLabelText("Student number")).toBeDisabled();
        expect(screen.getByLabelText("DLSU email")).toHaveValue("student@example.com");
        expect(screen.getByLabelText("DLSU email")).toBeDisabled();
        expect(screen.getByText("v1.0")).toBeInTheDocument();
        expect(getStudentProfile).toHaveBeenCalledWith(authenticatedRequest);
    });

    it("shows profile-load failures and retries", async () => {
        const user = userEvent.setup();
        getStudentProfile
            .mockRejectedValueOnce(new Error("Profile unavailable"))
            .mockResolvedValueOnce(profile);
        renderPage();

        expect(await screen.findByRole("alert")).toHaveTextContent("Profile unavailable");
        await user.click(screen.getByRole("button", { name: "Try again" }));

        expect(await screen.findByDisplayValue("BS Information Technology"))
            .toBeInTheDocument();
        expect(getStudentProfile).toHaveBeenCalledTimes(2);
    });

    it("normalizes and saves names and editable profile fields", async () => {
        const user = userEvent.setup();
        renderPage();
        await screen.findByDisplayValue("BS Information Technology");

        await user.clear(screen.getByLabelText("First name"));
        await user.type(screen.getByLabelText("First name"), "Janet");
        await user.click(screen.getByLabelText("Part-time work"));
        await user.click(screen.getByRole("button", { name: "Save settings" }));

        expect(updateStudentDetails).toHaveBeenCalledWith({
            first_name: "Janet",
            last_name: "Student",
        });
        expect(updateStudentProfile).toHaveBeenCalledWith(
            authenticatedRequest,
            expect.objectContaining({
                college: "College of Computer Studies",
                year_level: 3,
                current_academic_term: 1,
                is_employed: false,
                work_hours_per_week: 0,
            }),
        );
        const sentProfile = updateStudentProfile.mock.calls[0][1];
        expect(sentProfile).not.toHaveProperty("id");
        expect(sentProfile).not.toHaveProperty("student_id");
        expect(sentProfile).not.toHaveProperty("created_at");
        expect(await screen.findByText("Your settings were saved."))
            .toBeInTheDocument();
    });

    it("reports when only personal information is saved", async () => {
        const user = userEvent.setup();
        updateStudentProfile.mockRejectedValue(new Error("Profile update failed"));
        renderPage();
        await screen.findByDisplayValue("BS Information Technology");

        await user.clear(screen.getByLabelText("First name"));
        await user.type(screen.getByLabelText("First name"), "Janet");
        await user.click(screen.getByRole("button", { name: "Save settings" }));

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Your personal information was saved, but your profile settings could not be saved. Profile update failed",
        );
        expect(screen.getByLabelText("First name")).toHaveValue("Janet");
        expect(screen.getByDisplayValue("BS Information Technology"))
            .toBeInTheDocument();
    });

    it("reports when only profile settings are saved and retains unsaved names", async () => {
        const user = userEvent.setup();
        updateStudentDetails.mockRejectedValue(new Error("Name update failed"));
        renderPage();
        await screen.findByDisplayValue("BS Information Technology");

        await user.clear(screen.getByLabelText("First name"));
        await user.type(screen.getByLabelText("First name"), "Janet");
        await user.selectOptions(
            screen.getByLabelText("College"),
            "College of Science",
        );
        await user.click(screen.getByRole("button", { name: "Save settings" }));

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Your profile settings were saved, but your personal information could not be saved. Name update failed",
        );
        expect(screen.getByLabelText("First name")).toHaveValue("Janet");
        expect(screen.getByLabelText("College")).toHaveValue("College of Science");
    });

    it("prevents duplicate saves while both updates are pending", async () => {
        const user = userEvent.setup();
        const studentUpdate = deferred();
        const profileUpdate = deferred();
        updateStudentDetails.mockReturnValue(studentUpdate.promise);
        updateStudentProfile.mockReturnValue(profileUpdate.promise);
        renderPage();
        await screen.findByDisplayValue("BS Information Technology");

        const saveButton = screen.getByRole("button", { name: "Save settings" });
        await user.click(saveButton);

        expect(screen.getByRole("button", { name: "Saving settings…" }))
            .toBeDisabled();
        await user.click(screen.getByRole("button", { name: "Saving settings…" }));
        expect(updateStudentDetails).toHaveBeenCalledTimes(1);
        expect(updateStudentProfile).toHaveBeenCalledTimes(1);

        await act(async () => {
            studentUpdate.resolve(student);
            profileUpdate.resolve(profile);
        });
        expect(await screen.findByText("Your settings were saved."))
            .toBeInTheDocument();
    });

    it("signs out through the auth provider before returning to login", async () => {
        const user = userEvent.setup();
        const signOutRequest = deferred();
        logout.mockReturnValue(signOutRequest.promise);
        renderPage();
        await screen.findByDisplayValue("BS Information Technology");

        await user.click(screen.getByRole("button", { name: "Sign out" }));

        expect(logout).toHaveBeenCalledOnce();
        expect(screen.getByRole("button", { name: "Signing out…" })).toBeDisabled();
        await act(async () => {
            signOutRequest.resolve();
        });
        expect(await screen.findByText("Login destination")).toBeInTheDocument();
    });
});

describe("Settings wellness-summary export", () => {
    it("fetches authenticated data before creating the PDF and reports success", async () => {
        const user = userEvent.setup();
        const summaryRequest = deferred();
        getWellnessSummaryExport.mockReturnValue(summaryRequest.promise);
        renderPage();
        await screen.findByDisplayValue("BS Information Technology");

        await user.click(screen.getByRole("button", {
            name: /Export Your Data \(PDF\)/i,
        }));

        expect(getWellnessSummaryExport).toHaveBeenCalledWith(authenticatedRequest);
        expect(screen.getByRole("button", { name: /Preparing PDF/i })).toBeDisabled();
        expect(downloadWellnessSummaryPdf).not.toHaveBeenCalled();

        await act(async () => {
            summaryRequest.resolve(wellnessSummary);
        });

        expect(await screen.findByText(/wellness summary PDF has been downloaded/i))
            .toBeInTheDocument();
        expect(downloadWellnessSummaryPdf).toHaveBeenCalledWith(wellnessSummary);
    });

    it("shows an error when authenticated export data cannot be loaded", async () => {
        const user = userEvent.setup();
        getWellnessSummaryExport.mockRejectedValue(new Error("Server unavailable"));
        renderPage();
        await screen.findByDisplayValue("BS Information Technology");

        await user.click(screen.getByRole("button", {
            name: /Export Your Data \(PDF\)/i,
        }));

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "We could not create your PDF. Please try again.",
        );
        expect(downloadWellnessSummaryPdf).not.toHaveBeenCalled();
    });

    it("shows an error when PDF creation fails", async () => {
        const user = userEvent.setup();
        downloadWellnessSummaryPdf.mockRejectedValue(new Error("PDF failed"));
        renderPage();
        await screen.findByDisplayValue("BS Information Technology");

        await user.click(screen.getByRole("button", {
            name: /Export Your Data \(PDF\)/i,
        }));

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "We could not create your PDF. Please try again.",
        );
        expect(downloadWellnessSummaryPdf).toHaveBeenCalledWith(wellnessSummary);
        expect(screen.queryByText(/wellness summary PDF has been downloaded/i))
            .not.toBeInTheDocument();
    });
});
