"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const telegraf_1 = require("telegraf");
const filters_1 = require("telegraf/filters");
require("dotenv/config");
const axios_1 = __importDefault(require("axios"));
const big_js_1 = __importDefault(require("big.js"));
const bot = new telegraf_1.Telegraf(process.env.TOKEN);
const API_URL = "https://app.meteora.ag/clmm-api/pair/";
const LOW_CHAT = 34;
const HIGH_CHAT = 30;
const MEDIUM_CHAT = 32;
const LOW_LIQ = 100000;
const MEDIUM_LIQ = 500000;
const HIGH_LIQ = 1000000;
bot.start((ctx) => ctx.reply("Welcome"));
bot.on((0, filters_1.message)("sticker"), (ctx) => ctx.reply("👍"));
bot.hears("hi", (ctx) => ctx.reply("Hey there"));
bot.on((0, filters_1.message)("text"), async (ctx) => {
    console.log(ctx.message);
    // Check if this is a group message and if it's not from the General topic, ignore it
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    if (ctx.message.chat.type === "supergroup" && ctx.message.reply_to_message?.forum_topic_created?.name) {
        return;
    }
    const meteoraUrlRegex = /https:\/\/app\.meteora\.ag\/dlmm\/([^/\s]+)/;
    const match = ctx.message.text.match(meteoraUrlRegex);
    if (match) {
        const id = match[1];
        const fullUrl = match[0];
        const res = await axios_1.default.get(`${API_URL}${id}`);
        const { address, liquidity, name, mint_x, bin_step, base_fee_percentage } = res.data;
        const liquidityNumber = new big_js_1.default(liquidity);
        const message = [
            `Пул от: @${ctx.message.from.username}`,
            ``,
            `🔗 <a href="${fullUrl}">app.meteora.ag/...${address.slice(-8)}</a>`,
            `💱 ${name}`,
            `📜 <code>${mint_x}</code>`,
            `💰 ${Math.round(Number(liquidity)).toLocaleString()}$    🔢 ${bin_step} bins     💵 ${base_fee_percentage}%`,
            ``,
            `<a href="https://dexscreener.com/solana/${mint_x}">Ⲙ DexScreener</a>    <a href="https://gmgn.ai/sol/token/${mint_x}">🦎 GMGN</a>`,
        ].join("\n");
        if (liquidityNumber.lt(LOW_LIQ)) {
            await ctx.telegram.sendMessage(ctx.chat.id, fullUrl, {
                message_thread_id: LOW_CHAT,
                parse_mode: "HTML",
            });
        }
        else if (liquidityNumber.lt(MEDIUM_LIQ)) {
            await ctx.telegram.sendMessage(ctx.chat.id, fullUrl, {
                message_thread_id: MEDIUM_CHAT,
                parse_mode: "HTML",
            });
        }
        else {
            await ctx.telegram.sendMessage(ctx.chat.id, fullUrl, {
                message_thread_id: HIGH_CHAT,
                parse_mode: "HTML",
            });
        }
        // await ctx.telegram.sendMessage(ctx.chat.id, fullUrl, {
        //   message_thread_id: LOW_CHAT,
        //   parse_mode: "HTML",
        // })
    }
});
bot.launch();
// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
