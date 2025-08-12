"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
function requireAuth(req, res, next) {
    const hdr = req.headers.authorization;
    if (!(hdr === null || hdr === void 0 ? void 0 : hdr.startsWith('Bearer ')))
        return res.status(401).json({ message: 'Unauthorized: No token provided.' });
    try {
        const payload = jsonwebtoken_1.default.verify(hdr.slice(7), process.env.JWT_SECRET);
        req.user = payload;
        next();
    }
    catch (_a) {
        res.status(401).json({ message: 'Unauthorized: Invalid token.' });
    }
}
