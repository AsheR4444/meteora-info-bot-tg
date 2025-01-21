"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable @typescript-eslint/ban-ts-comment */
const worker_threads_1 = require("worker_threads");
const axios_1 = __importDefault(require("axios"));
const API_URL = "https://app.meteora.ag/clmm-api/pair/";
async function processUrl(url) {
    try {
        const meteoraUrlRegex = /https:\/\/app\.meteora\.ag\/dlmm\/([^/\s]+)/;
        const match = url.match(meteoraUrlRegex);
        if (match) {
            const id = match[1];
            const res = await axios_1.default.get(`${API_URL}${id}`);
            return { success: true, data: res.data, url };
        }
        return { success: false, error: "Invalid Meteora URL" };
    }
    catch (error) {
        // @ts-expect-error
        return { success: false, error: error.message };
    }
}
worker_threads_1.parentPort?.on("message", async (url) => {
    const result = await processUrl(url);
    worker_threads_1.parentPort?.postMessage(result);
});
