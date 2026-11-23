"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const contact_1 = require("../application/contact");
const authentication_middleware_1 = require("./middlewares/authentication-middleware");
const authorization_middleware_1 = require("./middlewares/authorization-middleware");
const rate_limit_middleware_1 = require("./middlewares/rate-limit-middleware");
const contactRouter = express_1.default.Router();
const contactLimiter = (0, rate_limit_middleware_1.createRateLimiter)(5, 60000);
contactRouter
    .route("/")
    .post(contactLimiter, contact_1.createContact)
    .get(authentication_middleware_1.isAuthenticated, authorization_middleware_1.isAdmin, contact_1.getAllContacts);
contactRouter
    .route("/:id/status")
    .patch(authentication_middleware_1.isAuthenticated, authorization_middleware_1.isAdmin, contact_1.updateContactStatus);
exports.default = contactRouter;
