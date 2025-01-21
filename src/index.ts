/* eslint-disable @typescript-eslint/ban-ts-comment */
import { Telegraf } from "telegraf"
import { message } from "telegraf/filters"
import "dotenv/config"
import { Worker } from "worker_threads"
import path from "path"
import numeral from "numeral"

const bot = new Telegraf(process.env.TOKEN!)
const workerPool: Worker[] = []
const MAX_WORKERS = 4

// Initialize worker pool
for (let i = 0; i < MAX_WORKERS; i++) {
  const worker = new Worker(path.join(__dirname, "messageWorker.js"))
  workerPool.push(worker)
}

let currentWorker = 0

const getNextWorker = () => {
  const worker = workerPool[currentWorker]
  currentWorker = (currentWorker + 1) % MAX_WORKERS
  return worker
}

interface QueueMessage {
  message: string
  replyToId: number
  chatId: number
  parseMode: "HTML"
  isDelayed?: boolean
}

class MessageQueue {
  private queue: QueueMessage[] = []
  private processing = false

  async add(msg: QueueMessage) {
    this.queue.push(msg)
    if (!this.processing) {
      this.process()
    }
  }

  private async process() {
    if (this.queue.length === 0) {
      this.processing = false
      return
    }

    this.processing = true
    const msg = this.queue.shift()!

    try {
      await bot.telegram.sendMessage(msg.chatId, msg.message, {
        parse_mode: msg.parseMode,
        // @ts-expect-error
        reply_to_message_id: msg.replyToId,
      })

      // Если это не отложенное сообщение, добавляем его дубликат в очередь
      if (!msg.isDelayed) {
        setTimeout(() => {
          this.add({
            ...msg,
            isDelayed: true,
          })
        }, 5000)
      }
    } catch (error) {
      console.error("Error sending message:", error)
    }

    // Небольшая задержка между сообщениями для гарантии порядка
    await new Promise((resolve) => setTimeout(resolve, 100))
    this.process()
  }
}

const messageQueue = new MessageQueue()

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

const processUrlWithWorker = async (url: string, worker: Worker): Promise<unknown> => {
  return new Promise((resolve, reject) => {
    const handleMessage = (result: unknown) => {
      worker.removeListener("error", handleError)
      resolve(result)
    }

    const handleError = (error: Error) => {
      worker.removeListener("message", handleMessage)
      reject(error)
    }

    worker.once("message", handleMessage)
    worker.once("error", handleError)
    worker.postMessage(url)
  })
}

bot.hears("/info", (ctx) => ctx.reply("I was made by @degencoding"))

bot.on(message("text"), async (ctx) => {
  // Check if this is a group message and if it's not from the General topic, ignore it
  // @ts-expect-error
  if (ctx.message.chat.type === "supergroup" && ctx.message.reply_to_message?.forum_topic_created?.name) {
    return
  }

  const meteoraUrlRegex = /https:\/\/app\.meteora\.ag\/dlmm\/[^/\s]+/g
  const urls = ctx.message.text.match(meteoraUrlRegex)

  if (!urls) return

  // Обрабатываем каждую ссылку независимо
  const processPromises = urls.map((url) => {
    const worker = getNextWorker()
    return processUrlWithWorker(url, worker)
  })

  // Ждем результаты обработки всех ссылок
  const results = await Promise.all(processPromises)

  // Добавляем все сообщения в очередь в правильном порядке
  for (const result of results) {
    // @ts-expect-error
    if (result.success) {
      // @ts-expect-error
      const { data, url } = result
      const { address, liquidity, name, mint_x, bin_step, base_fee_percentage } = data

      const message = [
        `Пул от: @${ctx.message.from.username}`,
        ``,
        `🔗 <a href="${url}">app.meteora.ag/...${address.slice(-8)}</a>`,
        `💱 ${name}`,
        `📜 <code>${mint_x}</code>`,
        `💰 ${numeral(liquidity).format("$0,0.00")}    🔢 ${bin_step} bins     💵 ${base_fee_percentage}%`,
        ``,
        `<a href="https://dexscreener.com/solana/${mint_x}">Ⲙ DexScreener</a>    <a href="https://gmgn.ai/sol/token/${mint_x}">🦎 GMGN</a>`,
      ].join("\n")

      await messageQueue.add({
        message,
        replyToId: ctx.message.message_id,
        chatId: ctx.message.chat.id,
        parseMode: "HTML",
      })
    }
  }
})

process.once("SIGINT", () => {
  // Cleanup workers on exit
  workerPool.forEach((worker) => worker.terminate())
  bot.stop("SIGINT")
})

process.once("SIGTERM", () => {
  workerPool.forEach((worker) => worker.terminate())
  bot.stop("SIGTERM")
})

bot.launch()
