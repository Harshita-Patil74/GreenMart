function getSearchTerms(search) {
  if (typeof search !== "string") return [];
  return search.trim().split(/\s+/).filter(Boolean);
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function createSearchRegex(term) {
  return new RegExp(escapeRegex(term), "i");
}

module.exports = { getSearchTerms, createSearchRegex };
