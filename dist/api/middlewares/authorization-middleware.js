"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAdmin = exports.checkIsAdminRequest = void 0;
const express_1 = require("@clerk/express");
const forbidden_error_1 = __importDefault(require("../../domain/errors/forbidden-error"));
const unauthorized_error_1 = __importDefault(require("../../domain/errors/unauthorized-error"));
// Short-lived cache for Clerk publicMetadata role lookups when JWT claims omit metadata
const roleCache = new Map();
const CACHE_TTL_MS = 60000;
const checkIsAdminRequest = async (req) => {
    const auth = req?.auth;
    const userId = auth?.userId;
    if (!userId)
        return false;
    const claims = auth?.sessionClaims;
    if (claims?.metadata?.role === "admin" ||
        claims?.publicMetadata?.role === "admin" ||
        claims?.role === "admin") {
        return true;
    }
    const cached = roleCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.isAdmin;
    }
    try {
        const user = await express_1.clerkClient.users.getUser(userId);
        const isUserAdmin = user?.publicMetadata?.role === "admin";
        roleCache.set(userId, {
            isAdmin: isUserAdmin,
            expiresAt: Date.now() + CACHE_TTL_MS,
        });
        return isUserAdmin;
    }
    catch {
        return false;
    }
};
exports.checkIsAdminRequest = checkIsAdminRequest;
const isAdmin = async (req, res, next) => {
    try {
        const userId = req?.auth?.userId;
        if (!userId) {
            return next(new unauthorized_error_1.default("Authentication required"));
        }
        const adminAllowed = await (0, exports.checkIsAdminRequest)(req);
        if (!adminAllowed) {
            return next(new forbidden_error_1.default("Admin privileges required"));
        }
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.isAdmin = isAdmin;
