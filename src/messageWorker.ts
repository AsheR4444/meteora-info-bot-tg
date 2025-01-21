/* eslint-disable @typescript-eslint/ban-ts-comment */
import { parentPort } from "worker_threads"
import axios from "axios"
import { MeteoraApiResponse } from "./types"

const API_URL = "https://app.meteora.ag/clmm-api/pair/"

async function processUrl(url: string) {
  try {
    const meteoraUrlRegex = /https:\/\/app\.meteora\.ag\/dlmm\/([^/\s]+)/
    const match = url.match(meteoraUrlRegex)

    if (match) {
      const id = match[1]
      const res = await axios.get<MeteoraApiResponse>(`${API_URL}${id}`)
      return { success: true, data: res.data, url }
    }
    return { success: false, error: "Invalid Meteora URL" }
  } catch (error) {
    // @ts-expect-error
    return { success: false, error: error.message }
  }
}

parentPort?.on("message", async (url) => {
  const result = await processUrl(url)
  parentPort?.postMessage(result)
})
