"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAuthenticated = void 0;
const forbidden_error_1 = __importDefault(require("../../domain/errors/forbidden-error"));
const isAuthenticated = (req, res, next) => {
    if (!req?.auth.userId) {
        throw new forbidden_error_1.default("Unauthorized");
    }
    next();
};
exports.isAuthenticated = isAuthenticated;
// this is the authentication middleware 
