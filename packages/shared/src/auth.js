"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authVerifyRequestSchema = exports.authNonceRequestSchema = exports.sessionStatusSchema = void 0;
const zod_1 = require("zod");
exports.sessionStatusSchema = zod_1.z.enum(["ACTIVE", "REVOKED", "EXPIRED"]);
exports.authNonceRequestSchema = zod_1.z.object({
    chainId: zod_1.z.number().int().positive(),
    walletAddress: zod_1.z.string().regex(/^0x[a-fA-F0-9]{40}$/)
});
exports.authVerifyRequestSchema = zod_1.z.object({
    chainId: zod_1.z.number().int().positive(),
    message: zod_1.z.string().min(1),
    signature: zod_1.z.string().min(1),
    walletAddress: zod_1.z.string().regex(/^0x[a-fA-F0-9]{40}$/)
});
//# sourceMappingURL=auth.js.map