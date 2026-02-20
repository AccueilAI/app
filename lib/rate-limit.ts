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

// Unauthenticated: 3 messages per day (by IP hash)
export const chatDailyLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(3, '1 d'),
  prefix: 'dl:chat:anon',
});

// Free tier: 3 chat messages/day
export const chatDailyLimitFree = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(3, '1 d'),
  prefix: 'dl:chat:free',
});

// Plus tier: 20 chat messages/day
export const chatDailyLimitPlus = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(20, '1 d'),
  prefix: 'dl:chat:plus',
});

// Plus tier: 3 checklist/day
export const checklistDailyLimitPlus = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(3, '1 d'),
  prefix: 'dl:checklist:plus',
});

// Pro tier: 10 checklist/day
export const checklistDailyLimitPro = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(10, '1 d'),
  prefix: 'dl:checklist:pro',
});

// Plus tier: 3 doc analysis/day
export const docAnalysisDailyLimitPlus = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(3, '1 d'),
  prefix: 'dl:doc:plus',
});

// Pro tier: 10 doc analysis/day
export const docAnalysisDailyLimitPro = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(10, '1 d'),
  prefix: 'dl:doc:pro',
});

// Deadline CRUD: 20 requests per 60 seconds
export const deadlineRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, '60 s'),
  prefix: 'rl:deadline',
});
