export async function getWellnessSummaryExport(authenticatedRequest) {
    const response = await authenticatedRequest("/api/exports/wellness-summary");
    return response.wellnessSummary;
}
