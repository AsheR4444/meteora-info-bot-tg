"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable @typescript-eslint/ban-ts-comment */
const telegraf_1 = require("telegraf");
const filters_1 = require("telegraf/filters");
require("dotenv/config");
const worker_threads_1 = require("worker_threads");
const path_1 = __importDefault(require("path"));
const numeral_1 = __importDefault(require("numeral"));
const bot = new telegraf_1.Telegraf(process.env.TOKEN);
const workerPool = [];
const MAX_WORKERS = 4;
// Initialize worker pool
for (let i = 0; i < MAX_WORKERS; i++) {
    const worker = new worker_threads_1.Worker(path_1.default.join(__dirname, "messageWorker.js"));
    workerPool.push(worker);
}
let currentWorker = 0;
const getNextWorker = () => {
    const worker = workerPool[currentWorker];
    currentWorker = (currentWorker + 1) % MAX_WORKERS;
    return worker;
};
class MessageQueue {
    constructor() {
        this.queue = [];
        this.processing = false;
    }
    async add(msg) {
        this.queue.push(msg);
        if (!this.processing) {
            this.process();
        }
    }
    async process() {
        if (this.queue.length === 0) {
            this.processing = false;
            return;
        }
        this.processing = true;
        const msg = this.queue.shift();
        try {
            await bot.telegram.sendMessage(msg.chatId, msg.message, {
                parse_mode: msg.parseMode,
                // @ts-expect-error
                reply_to_message_id: msg.replyToId,
            });
            // Если это не отложенное сообщение, добавляем его дубликат в очередь
            if (!msg.isDelayed) {
                setTimeout(() => {
                    this.add({
                        ...msg,
                        isDelayed: true,
                    });
                }, 5000);
            }
        }
        catch (error) {
            console.error("Error sending message:", error);
        }
        // Небольшая задержка между сообщениями для гарантии порядка
        await new Promise((resolve) => setTimeout(resolve, 100));
        this.process();
    }
}
const messageQueue = new MessageQueue();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const processUrlWithWorker = async (url, worker) => {
    return new Promise((resolve, reject) => {
        const handleMessage = (result) => {
            worker.removeListener("error", handleError);
            resolve(result);
        };
        const handleError = (error) => {
            worker.removeListener("message", handleMessage);
            reject(error);
        };
        worker.once("message", handleMessage);
        worker.once("error", handleError);
        worker.postMessage(url);
    });
};
bot.hears("/info", (ctx) => ctx.reply("I was made by @degencoding"));
bot.on((0, filters_1.message)("text"), async (ctx) => {
    // Check if this is a group message and if it's not from the General topic, ignore it
    // @ts-expect-error
    if (ctx.message.chat.type === "supergroup" && ctx.message.reply_to_message?.forum_topic_created?.name) {
        return;
    }
    const meteoraUrlRegex = /https:\/\/app\.meteora\.ag\/dlmm\/[^/\s]+/g;
    const urls = ctx.message.text.match(meteoraUrlRegex);
    if (!urls)
        return;
    // Обрабатываем каждую ссылку независимо
    const processPromises = urls.map((url) => {
        const worker = getNextWorker();
        return processUrlWithWorker(url, worker);
    });
    // Ждем результаты обработки всех ссылок
    const results = await Promise.all(processPromises);
    // Добавляем все сообщения в очередь в правильном порядке
    for (const result of results) {
        // @ts-expect-error
        if (result.success) {
            // @ts-expect-error
            const { data, url } = result;
            const { address, liquidity, name, mint_x, bin_step, base_fee_percentage } = data;
            const message = [
                `Пул от: @${ctx.message.from.username}`,
                ``,
                `🔗 <a href="${url}">app.meteora.ag/...${address.slice(-8)}</a>`,
                `💱 ${name}`,
                `📜 <code>${mint_x}</code>`,
                `💰 ${(0, numeral_1.default)(liquidity).format("$0,0.00")}    🔢 ${bin_step} bins     💵 ${base_fee_percentage}%`,
                ``,
                `<a href="https://dexscreener.com/solana/${mint_x}">Ⲙ DexScreener</a>    <a href="https://gmgn.ai/sol/token/${mint_x}">🦎 GMGN</a>`,
            ].join("\n");
            await messageQueue.add({
                message,
                replyToId: ctx.message.message_id,
                chatId: ctx.message.chat.id,
                parseMode: "HTML",
            });
        }
    }
});
process.once("SIGINT", () => {
    // Cleanup workers on exit
    workerPool.forEach((worker) => worker.terminate());
    bot.stop("SIGINT");
});
process.once("SIGTERM", () => {
    workerPool.forEach((worker) => worker.terminate());
    bot.stop("SIGTERM");
});
bot.launch();
