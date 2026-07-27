import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../context/useAuth";
import { usePrototypeData } from "../context/usePrototypeData";
import { demoData } from "../data/demoData";
import { downloadWellnessSummaryPdf } from "../services/wellnessSummaryPdf";
import { getWellnessSummaryExport } from "../services/wellnessSummaryExportApi";
import Settings from "./Settings";

vi.mock("../context/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("../context/usePrototypeData", () => ({ usePrototypeData: vi.fn() }));
vi.mock("../services/wellnessSummaryPdf", () => ({
    downloadWellnessSummaryPdf: vi.fn()
}));
vi.mock("../services/wellnessSummaryExportApi", () => ({
    getWellnessSummaryExport: vi.fn()
}));

const authenticatedRequest = vi.fn();
const wellnessSummary = {
    generated_at: "2026-07-27T04:00:00.000Z",
    student: {
        first_name: "Jamie",
        last_name: "Student",
        student_number: "12345678",
        email: "student@example.com"
    },
    profile: demoData.profile,
    check_ins: [],
    dimension_scores: []
};

function renderPage() {
    return render(
        <MemoryRouter initialEntries={["/settings"]}>
            <Settings />
        </MemoryRouter>
    );
}

beforeEach(() => {
    authenticatedRequest.mockReset();
    getWellnessSummaryExport.mockReset();
    downloadWellnessSummaryPdf.mockReset();
    useAuth.mockReturnValue({
        authenticatedRequest,
        logout: vi.fn(),
        student: demoData.student,
        user: { email: demoData.student.email }
    });
    usePrototypeData.mockReturnValue({
        student: demoData.student,
        profile: demoData.profile,
        updateSettings: vi.fn()
    });
    getWellnessSummaryExport.mockResolvedValue(wellnessSummary);
    downloadWellnessSummaryPdf.mockResolvedValue(undefined);
});

describe("Settings wellness-summary export", () => {
    it("fetches authenticated data before creating the PDF and reports success", async () => {
        const user = userEvent.setup();
        let resolveSummary;
        getWellnessSummaryExport.mockImplementation(() => (
            new Promise((resolve) => {
                resolveSummary = resolve;
            })
        ));
        renderPage();

        const exportButton = screen.getByRole("button", {
            name: /Export Your Data \(PDF\)/i
        });
        await user.click(exportButton);

        expect(getWellnessSummaryExport).toHaveBeenCalledWith(authenticatedRequest);
        expect(screen.getByRole("button", { name: /Preparing PDF/i })).toBeDisabled();
        expect(downloadWellnessSummaryPdf).not.toHaveBeenCalled();

        resolveSummary(wellnessSummary);

        expect(await screen.findByText(/wellness summary PDF has been downloaded/i))
            .toBeInTheDocument();
        expect(downloadWellnessSummaryPdf).toHaveBeenCalledWith(wellnessSummary);
    });

    it("shows an error when authenticated export data cannot be loaded", async () => {
        const user = userEvent.setup();
        getWellnessSummaryExport.mockRejectedValue(new Error("Server unavailable"));
        renderPage();

        await user.click(screen.getByRole("button", {
            name: /Export Your Data \(PDF\)/i
        }));

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "We could not create your PDF. Please try again."
        );
        expect(downloadWellnessSummaryPdf).not.toHaveBeenCalled();
    });

    it("shows an error when PDF creation fails", async () => {
        const user = userEvent.setup();
        downloadWellnessSummaryPdf.mockRejectedValue(new Error("PDF failed"));
        renderPage();

        await user.click(screen.getByRole("button", {
            name: /Export Your Data \(PDF\)/i
        }));

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "We could not create your PDF. Please try again."
        );
        expect(downloadWellnessSummaryPdf).toHaveBeenCalledWith(wellnessSummary);
        expect(screen.queryByText(/wellness summary PDF has been downloaded/i))
            .not.toBeInTheDocument();
    });
});
