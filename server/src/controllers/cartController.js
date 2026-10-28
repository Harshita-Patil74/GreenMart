const cartService = require("../services/cartService");
const { asyncHandler } = require("../utils/asyncHandler");
exports.get = asyncHandler(async (req,res) => res.json(await cartService.getCart(req.user._id) || { items: [] }));
exports.addItem = asyncHandler(async (req,res) => res.json(await cartService.addItem(req.user._id, req.body.productId, req.body.quantity||1)));
exports.updateItem = asyncHandler(async (req,res) => res.json(await cartService.updateItem(req.user._id, req.params.productId, req.body.quantity)));
exports.removeItem = asyncHandler(async (req,res) => res.json(await cartService.removeItem(req.user._id, req.params.productId)));
exports.clear = asyncHandler(async (req,res) => { await cartService.clearCart(req.user._id); res.json({ message: "cleared" }); });
