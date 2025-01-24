import numeral from "numeral"
import { DexScreenerPoolResponse, MeteoraApiResponse } from "./types"

export const formatPoolAge = (createdAt: number): string => {
  const now = Date.now()
  const diffHours = Math.floor((now - createdAt) / (1000 * 60 * 60))
  const days = Math.floor(diffHours / 24)
  const hours = diffHours % 24

  if (days === 0) {
    return `${hours}h`
  }
  if (hours === 0) {
    return `${days}d ago`
  }
  return `${days}d ago`
}

export const formatPoolMessage = (
  meteoraData: MeteoraApiResponse,
  dexScreenerData: DexScreenerPoolResponse,
  username: string,
  poolUrl: string,
): string => {
  const { address, liquidity, name, mint_x, bin_step, base_fee_percentage } = meteoraData
  const { volume, pairCreatedAt } = dexScreenerData.pair
  const domain = poolUrl.includes("edge.") ? "edge.meteora.ag" : "app.meteora.ag"

  return [
    `${username && `Пул от: @${username}`}`,
    `🔗 <a href="${poolUrl}">${domain}/...${address.slice(-8)}</a>`,
    `💱 ${name}`,
    `📜 <code>${mint_x}</code>`,
    `💰 ${numeral(liquidity).format("$0,0.00")}    🔢 ${bin_step} bins     💵 ${base_fee_percentage}%`,
    `🪣 5min: ${numeral(volume.m5).format("$0,0.00")}    24h: ${numeral(volume.h24).format("$0,0.00")}`,
    `⌚ ${formatPoolAge(pairCreatedAt)}`,
  ].join("\n")
}
