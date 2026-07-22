const PAGE_SIZE = 100;

export async function listAllAcademicRecords(authenticatedRequest) {
  const records = [];
  let offset = 0;

  while (true) {
    const response = await authenticatedRequest(
      `/api/academic-records?limit=${PAGE_SIZE}&offset=${offset}`,
    );
    const page = response.records || [];
    records.push(...page);

    if (!response.pagination?.has_more || page.length === 0) break;
    offset += page.length;
  }

  return records;
}

export async function createAcademicRecord(authenticatedRequest, payload) {
  const response = await authenticatedRequest("/api/academic-records", {
    method: "POST",
    body: payload,
  });
  return response.academicRecord;
}
