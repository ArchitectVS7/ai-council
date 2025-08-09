import { kv } from '@vercel/kv'
import { z } from 'zod'

export interface RateLimitConfig {
  requests: number
  window: number // seconds
}

export const defaultRateLimits = {
  completion: { requests: 10, window: 60 }, // 10 requests per minute
  workflow: { requests: 5, window: 300 }, // 5 workflow executions per 5 minutes
  template: { requests: 20, window: 60 }, // 20 template requests per minute
}

export async function rateLimit(
  identifier: string,
  config: RateLimitConfig,
  action: string
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  const key = `ratelimit:${action}:${identifier}`
  
  try {
    const current = await kv.get<number>(key) || 0
    const now = Math.floor(Date.now() / 1000)
    const windowStart = Math.floor(now / config.window) * config.window
    const reset = windowStart + config.window
    
    if (current >= config.requests) {
      return {
        success: false,
        limit: config.requests,
        remaining: 0,
        reset,
      }
    }
    
    const newCount = current + 1
    await kv.setex(key, config.window, newCount)
    
    return {
      success: true,
      limit: config.requests,
      remaining: config.requests - newCount,
      reset,
    }
  } catch (error) {
    // If KV is unavailable, allow the request (fail open)
    console.warn('Rate limiting unavailable:', error)
    return {
      success: true,
      limit: config.requests,
      remaining: config.requests - 1,
      reset: Math.floor(Date.now() / 1000) + config.window,
    }
  }
}

export function getClientIdentifier(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }
  
  if (realIP) {
    return realIP
  }
  
  // Fallback to a more generic identifier
  return 'anonymous'
}