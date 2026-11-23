"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAuthenticated = void 0;
const unauthorized_error_1 = __importDefault(require("../../domain/errors/unauthorized-error"));
const isAuthenticated = (req, res, next) => {
    const userId = req?.auth?.userId;
    if (!userId) {
        return next(new unauthorized_error_1.default("Authentication required"));
    }
    next();
};
exports.isAuthenticated = isAuthenticated;
