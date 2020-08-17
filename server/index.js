const keys = require('./keys')

const { Pool } = require('pg')
const redis = require('redis')
const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')

const app = express()
app.use(cors())
app.use(bodyParser.json())

const pgClient = new Pool({
  user: keys.pgUser,
  host: keys.pgHost,
  database: keys.pgDatabase,
  password: keys.pgPassword,
  port: keys.pgPort
})

pgClient.on('error', () => console.log('Lost PG connection'))

pgClient
  .query('create table if not exists values (number INT)')
  .catch(err => console.log(err))


const redisClient = redis.createClient({
  host: keys.redisHost,
  port: keys.redisPort,
  retry_strategy: () => 1000
})
const redisPublisher = redisClient.duplicate()

app.get('/', (_, res) => {
  res.send('Hi')
})

app.get('/values/all', async (_, res) => {
  const values = await pgClient.query('SELECT * FROM values')

  res.send(values.rows)
})

app.get('/values/current', async (_, res) => {
  redisClient.hgetall('values', (err, values) => {
    console.log(err)
    res.send(values)
  })
})

app.post('/values', async (req, res) => {
  const index = parseInt(req.body.index)
  if (index > 40) {
    return res.status(422).send('Index value is too high')
  }

  redisClient.hset('values', index, 'Nothing yet!')
  redisPublisher.publish('insert', index)
  pgClient.query('INSERT INTO values(number) VALUES($1)', [index])

  res.send({ working: true })
})

app.listen(5000, () => {
  console.log('Listening on port 5000')
})
