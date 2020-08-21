import * as polka from 'polka'
import * as dotenv from 'dotenv'
import {json} from 'body-parser'
const cors = require('cors')({origin: true})
import neo4j from 'neo4j-driver'
dotenv.config()

type EntityType =
  | 'Skill'
  | 'Job'
  | 'Industry'
  | 'Major'
  | 'Company'
  | 'Product'
  | 'Function'
  | 'DataSource'

type RelationType =
  | 'REQUIRES'
  | 'RELATES_TO'
  | 'BELONGS_TO'
  | 'HAS_ACCESS_TO'
  | 'INVOLVES'

const driver = neo4j.driver(
  process.env.NEO4J_ADDRESS,
  neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD),
)
const session = driver.session()

async function getEntity(name: string) {
  const rawData = await session.run(`
    MATCH (s)-[d]-(q) 
    WHERE q.name = "${name}"
    WITH 
      collect(s)+collect(q) as rawNodes,
      collect(d) as edges 
    UNWIND rawNodes as unodes 
    WITH edges, collect(DISTINCT unodes) as nodes
    RETURN nodes, edges
  `)

  return {
    nodes:
      (rawData &&
        rawData.records &&
        rawData.records[0] &&
        //@ts-ignore
        rawData.records[0]._fields[0]) ||
      [],
    edges:
      (rawData &&
        rawData.records &&
        rawData.records[0] &&
        //@ts-ignore
        rawData.records[0]._fields[1]) ||
      [],
  }
}

async function addEntity(name: string, type: EntityType) {
  const result = await session.run(
    `MERGE (a: ${type} {name: "${name}"}) RETURN a`,
  )
  console.log(result)
}

async function addRelation(
  from: string,
  fromType: EntityType,
  to: string,
  toType: EntityType,
  relation: RelationType,
) {
  const result = await session.run(`
    MATCH (from: ${fromType}) WHERE from.name = "${from}"
    MATCH (to: ${toType}) WHERE to.name = "${to}"
    MERGE (from)-[:${relation}]->(to)
    RETURN from, to  
  `)
  console.log(result)
}

polka()
  .use(cors, json())
  .get('/entity', async (req, res) => {
    const {name} = req.query
    res.statusCode = 200
    res.end(JSON.stringify(await getEntity(name as string)))
  })
  .post('/entity', async (req, res) => {
    const {name, type} = req.body
    await addEntity(name, type)
    res.statusCode = 200
    res.end('')
  })
  .post('/relation', async (req, res) => {
    const {from, fromType, to, toType, relation} = req.body
    await addRelation(from, fromType, to, toType, relation)
    res.statusCode = 200
    res.end('')
  })
  .listen(3000, (err: Error) => {
    if (err) throw err
    console.log(`> Running on localhost:3000`)
  })

process.on('exit', async () => {
  await session.close()
  await driver.close()
})
