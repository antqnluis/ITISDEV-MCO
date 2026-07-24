const PAGE_SIZE = 100;

export async function listAllWellnessDimensionScores(authenticatedRequest) {
  const scores = [];
  let offset = 0;

  while (true) {
    const response = await authenticatedRequest(
      `/api/wellness-dimension-scores?limit=${PAGE_SIZE}&offset=${offset}`,
    );
    const page = response.wellnessDimensionScores || [];
    scores.push(...page);

    if (!response.pagination?.has_more || page.length === 0) break;
    offset += page.length;
  }

  return scores;
}
