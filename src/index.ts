import "dotenv/config"

import axios from "axios"
import numeral from "numeral"
import { Telegraf, Context } from "telegraf"
import { message } from "telegraf/filters"
import { Message, Update } from "telegraf/typings/core/types/typegram"

import { MeteoraApiResponse } from "./types"

const BOT_TOKEN = process.env.TOKEN!
const METEORA_API_URL = "https://app.meteora.ag/clmm-api/pair/"
const METEORA_URL_PATTERN = /https:\/\/app\.meteora\.ag\/dlmm\/([^/\s]+)/

const bot = new Telegraf(BOT_TOKEN)

const formatPoolMessage = (data: MeteoraApiResponse, username: string, poolUrl: string): string => {
  const { address, liquidity, name, mint_x, bin_step, base_fee_percentage } = data

  return [
    `Пул от: @${username}`,
    ``,
    `🔗 <a href="${poolUrl}">app.meteora.ag/...${address.slice(-8)}</a>`,
    `💱 ${name}`,
    `📜 <code>${mint_x}</code>`,
    `💰 ${numeral(liquidity).format("$0,0.00")}    🔢 ${bin_step} bins     💵 ${base_fee_percentage}%`,
    ``,
    `<a href="https://dexscreener.com/solana/${mint_x}">Ⲙ DexScreener</a>    <a href="https://gmgn.ai/sol/token/${mint_x}">🦎 GMGN</a>`,
  ].join("\n")
}

type MessageContext = Context<Update> & {
  message: Message.TextMessage
}

const processPoolUrl = async (ctx: MessageContext, poolUrl: string, poolId: string): Promise<void> => {
  try {
    const response = await axios.get<MeteoraApiResponse>(`${METEORA_API_URL}${poolId}`)
    const message = formatPoolMessage(response.data, ctx.message.from.username ?? "", poolUrl)

    await ctx.reply(message, {
      parse_mode: "HTML",
      // @ts-ignore
      reply_to_message_id: ctx.message.message_id,
    })
  } catch (error) {
    console.error(`Error processing pool ${poolId}:`, error)
  }
}

bot.hears("/info", (ctx) => ctx.reply("Made by @degencoding"))

bot.on(message("text"), (ctx) => {
  // @ts-ignore
  if (ctx.message.chat.type === "supergroup" && ctx.message.reply_to_message?.forum_topic_created?.name) {
    return
  }

  const match = ctx.message.text.match(METEORA_URL_PATTERN)
  if (match) {
    const [fullUrl, poolId] = match

    processPoolUrl(ctx, fullUrl, poolId)
  }
})

bot.launch()

process.once("SIGINT", () => bot.stop("SIGINT"))
process.once("SIGTERM", () => bot.stop("SIGTERM"))
