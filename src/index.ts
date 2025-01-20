import { Telegraf } from "telegraf"
import { message } from "telegraf/filters"
import "dotenv/config"
import axios from "axios"
import numeral from "numeral"

import { MeteoraApiResponse } from "./types"

const bot = new Telegraf(process.env.TOKEN!)
const API_URL = "https://app.meteora.ag/clmm-api/pair/"

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

bot.hears("/info", (ctx) => ctx.reply("I was made by @degencoding"))

bot.on(message("text"), async (ctx) => {
  // Check if this is a group message and if it's not from the General topic, ignore it
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  if (ctx.message.chat.type === "supergroup" && ctx.message.reply_to_message?.forum_topic_created?.name) {
    return
  }

  const meteoraUrlRegex = /https:\/\/app\.meteora\.ag\/dlmm\/([^/\s]+)/
  const match = ctx.message.text.match(meteoraUrlRegex)

  if (match) {
    const id = match[1]
    const fullUrl = match[0]

    const res = await axios.get<MeteoraApiResponse>(`${API_URL}${id}`)
    const { address, liquidity, name, mint_x, bin_step, base_fee_percentage } = res.data

    const message = [
      `Пул от: @${ctx.message.from.username}`,
      ``,
      `🔗 <a href="${fullUrl}">app.meteora.ag/...${address.slice(-8)}</a>`,
      `💱 ${name}`,
      `📜 <code>${mint_x}</code>`,
      `💰 ${numeral(liquidity).format("$0,0.00")}    🔢 ${bin_step} bins     💵 ${base_fee_percentage}%`,
      ``,
      `<a href="https://dexscreener.com/solana/${mint_x}">Ⲙ DexScreener</a>    <a href="https://gmgn.ai/sol/token/${mint_x}">🦎 GMGN</a>`,
    ].join("\n")

    await ctx.reply(message, {
      parse_mode: "HTML",
      reply_to_message_id: ctx.message.message_id,
    })

    await sleep(5000)

    await ctx.reply(message, {
      parse_mode: "HTML",
      reply_to_message_id: ctx.message.message_id,
    })
  }
})

bot.launch()

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"))
process.once("SIGTERM", () => bot.stop("SIGTERM"))
