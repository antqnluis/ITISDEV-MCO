export function selectPrimaryStressContext(dimensions) {
  const orderedDimensions = [...dimensions].sort((a, b) => b.score - a.score);
  const allDimensionsHighConcern = orderedDimensions.every(({ score }) => score > 75);

  return {
    orderedDimensions,
    primaryContext: allDimensionsHighConcern
      ? "mixed"
      : orderedDimensions[0].name,
  };
}
