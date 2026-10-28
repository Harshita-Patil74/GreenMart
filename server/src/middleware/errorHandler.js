function notFound(req, res) { res.status(404).json({ message: "Route not found" }); }
function errorHandler(err, req, res, next) {
  if (err.name === "AssistantServiceError") {
    return res.status(err.status || 502).json({ message: err.message });
  }
  console.error(err);
  const status = err.status || (err.name === "MulterError" ? 400 : 500);
  const message = err.name === "MulterError" ? `Image upload failed: ${err.message}` : err.message || "Server error";
  res.status(status).json({ message });
}
module.exports = { notFound, errorHandler };
