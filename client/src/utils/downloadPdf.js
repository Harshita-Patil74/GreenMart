export async function downloadPdf(response, filename) {
  const responseBlob = response?.data;
  const blob = responseBlob instanceof Blob
    ? responseBlob
    : new Blob([responseBlob], { type: response?.headers?.["content-type"] || "" });
  const contentType = (blob.type || response?.headers?.["content-type"] || "").split(";")[0].trim().toLowerCase();
  if (contentType !== "application/pdf" || (await blob.slice(0, 5).text()) !== "%PDF-") {
    throw new Error("The server response was not a valid PDF. Please try again.");
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
