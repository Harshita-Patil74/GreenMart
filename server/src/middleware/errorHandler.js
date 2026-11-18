function notFound(req, res) { res.status(404).json({ message: "Route not found" }); }
function errorHandler(err, req, res, next) {
  if (err.name === "AssistantServiceError") {
    const status = err.status || 502;
    if (status >= 500) console.error(err);
    return res.status(status).json({ message: err.message });
  }
  const status = err.status || (err.name === "MulterError" ? 400 : 500);
  const message = err.name === "MulterError" ? `Image upload failed: ${err.message}` : err.message || "Server error";
  const body = { message };
  if (err.code) body.code = err.code;
  if (status >= 500) {
    console.error(err);
  } else {
    console.warn("Client error:", err.message);
  }
  res.status(status).json(body);
}
module.exports = { notFound, errorHandler };
