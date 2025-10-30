import mysql from "mysql2/promise"

let pool = null

function getConfig() {
  const host = process.env.DB_HOST ?? "127.0.0.1"
  const port = Number.parseInt(process.env.DB_PORT ?? "3307", 10)
  const user = process.env.DB_USER ?? "drone_user"
  const password = process.env.DB_PASSWORD ?? "dronepwd"
  const database = process.env.DB_NAME ?? "drone_sop"

  return {
    host,
    port: Number.isNaN(port) ? 3307 : port,
    user,
    password,
    database,
  }
}

export function getPool() {
  if (!pool) {
    const config = getConfig()
    pool = mysql.createPool({
      ...config,
      waitForConnections: true,
      connectionLimit: 10,
      timezone: "Z",
    })
  }

  return pool
}

export async function runQuery(sql, params = []) {
  const currentPool = getPool()
  const [rows] = await currentPool.query(sql, params)
  return rows
}
