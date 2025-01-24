import "dotenv/config"

import axios from "axios"
import { Telegraf, Context } from "telegraf"
import { message } from "telegraf/filters"
import { Message, Update } from "telegraf/typings/core/types/typegram"

import { DexScreenerPoolResponse, MeteoraApiResponse } from "./types"
import { formatPoolMessage } from "./helpers"

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
const DEXSCREENER_PAIRS_URL = "https://api.dexscreener.com/latest/dex/pairs/solana/"

const bot = new Telegraf(BOT_TOKEN)

type MessageContext = Context<Update> & {
  message: Message.TextMessage
}

const processPoolUrl = async (ctx: MessageContext, poolUrl: string, poolId: string, apiUrl: string): Promise<void> => {
  try {
    const meteoraResponse = await axios.get<MeteoraApiResponse>(`${apiUrl}${poolId}`)
    const dexScreenerResponse = await axios.get<DexScreenerPoolResponse>(`${DEXSCREENER_PAIRS_URL}${poolId}`)
    const message = formatPoolMessage(
      meteoraResponse.data,
      dexScreenerResponse.data,
      ctx.message.from.username ?? "",
      poolUrl,
    )

    await ctx.reply(message, {
      parse_mode: "HTML",
      // @ts-ignore
      disable_web_page_preview: true,
      // @ts-ignore
      reply_to_message_id: ctx.message.message_id,
      reply_markup: {
        inline_keyboard: [
          [
            { text: "Ⲙ DexScreener", url: `https://dexscreener.com/solana/${meteoraResponse.data.mint_x}` },
            { text: "🦎 GMGN", url: `https://gmgn.ai/sol/token/${meteoraResponse.data.mint_x}` },
          ],
        ],
      },
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
