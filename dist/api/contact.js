"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const contact_1 = require("../application/contact");
const contactRouter = express_1.default.Router();
contactRouter.route("/").post(contact_1.createContact);
exports.default = contactRouter;
