"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContactDTO = void 0;
const zod_1 = require("zod");
exports.ContactDTO = zod_1.z.object({
    name: zod_1.z.string().min(2, "Name must be at least 2 characters"),
    email: zod_1.z.string().email("Invalid email address"),
    message: zod_1.z.string().min(5, "Message must be at least 5 characters"),
});
