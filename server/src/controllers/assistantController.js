const assistantService = require("../services/assistantService");
const { asyncHandler } = require("../utils/asyncHandler");
exports.chat = asyncHandler(async (req, res) => {
  const response = await assistantService.chat(req.body.message, req.body.history);
  res.json(response);
});
module.exports = exports;
