import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Chat API: 10 requests per 60 seconds
export const chatRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '60 s'),
  prefix: 'rl:chat',
});

// Feedback API: 30 requests per 60 seconds
export const feedbackRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, '60 s'),
  prefix: 'rl:feedback',
});

// Waitlist API: 3 requests per 60 seconds
export const waitlistRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, '60 s'),
  prefix: 'rl:waitlist',
});
