const redis = require('redis')

const keys = require('./keys')

const redisClient = redis.createClient({
  host: keys.redisHost,
  post: keys.redisPort,
  retry_strategy: () => 1000
})

const sub = redisClient.duplicate()

const fib = index => {
  if (index < 2) return 1
  return fib(index - 1) + fib(index - 2)
}

sub.on('message', (_, message) => {
  redisClient.hset('values', message, fib(parseInt(message)))
})

sub.subscribe('insert')