function validate(schema) {
  return (req, res, next) => {
    try {
      const parsed = schema.parse({ body: req.body, params: req.params, query: req.query });
      if (parsed.body) req.body = parsed.body;
      if (parsed.params) req.params = parsed.params;
      if (parsed.query) req.query = parsed.query;
      next();
    } catch (e) {
      return res.status(400).json({ message: "Validation error", errors: e.errors });
    }
  };
}
module.exports = { validate };
