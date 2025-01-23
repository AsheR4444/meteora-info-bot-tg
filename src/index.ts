import "dotenv/config"

import axios from "axios"
import numeral from "numeral"
import { Telegraf, Context } from "telegraf"
import { message } from "telegraf/filters"
import { Message, Update } from "telegraf/typings/core/types/typegram"

import { MeteoraApiResponse } from "./types"

const BOT_TOKEN = process.env.TOKEN!
const METEORA_URL_PATTERNS = {
  app: {
    url: /https:\/\/app\.meteora\.ag\/dlmm\/([^/\s]+)/,
    api: "https://app.meteora.ag/clmm-api/pair/",
  },
  edge: {
    url: /https:\/\/edge\.meteora\.ag\/dlmm\/([^/\s]+)/,
    api: "https://edge.meteora.ag/clmm-api/pair/",
  },
}

const bot = new Telegraf(BOT_TOKEN)

const formatPoolMessage = (data: MeteoraApiResponse, username: string, poolUrl: string): string => {
  const { address, liquidity, name, mint_x, bin_step, base_fee_percentage } = data
  const domain = poolUrl.includes("edge.") ? "edge.meteora.ag" : "app.meteora.ag"

  return [
    `${username && `Пул от: @${username}`}`,
    ``,
    `🔗 <a href="${poolUrl}">${domain}/...${address.slice(-8)}</a>`,
    `💱 ${name}`,
    `📜 <code>${mint_x}</code>`,
    `💰 ${numeral(liquidity).format("$0,0.00")}    🔢 ${bin_step} bins     💵 ${base_fee_percentage}%`,
  ].join("\n")
}

type MessageContext = Context<Update> & {
  message: Message.TextMessage
}

const processPoolUrl = async (ctx: MessageContext, poolUrl: string, poolId: string, apiUrl: string): Promise<void> => {
  try {
    const response = await axios.get<MeteoraApiResponse>(`${apiUrl}${poolId}`)
    const message = formatPoolMessage(response.data, ctx.message.from.username ?? "", poolUrl)

    await ctx.reply(message, {
      parse_mode: "HTML",
      // @ts-ignore
      disable_web_page_preview: true,
      // @ts-ignore
      reply_to_message_id: ctx.message.message_id,
      reply_markup: {
        inline_keyboard: [
          [
            { text: "Ⲙ DexScreener", url: `https://dexscreener.com/solana/${response.data.mint_x}` },
            { text: "🦎 GMGN", url: `https://gmgn.ai/sol/token/${response.data.mint_x}` }
          ]
        ]
      }
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

  for (const { url: pattern, api } of Object.values(METEORA_URL_PATTERNS)) {
    const match = ctx.message.text.match(pattern)
    if (match) {
      const [fullUrl, poolId] = match
      processPoolUrl(ctx, fullUrl, poolId, api)
      break
    }
  }
})

bot.launch()

process.once("SIGINT", () => bot.stop("SIGINT"))
process.once("SIGTERM", () => bot.stop("SIGTERM"))
