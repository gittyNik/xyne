import config from "@/config"
import { defineConfig } from "drizzle-kit"
export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema.ts",
  out: "./migrations",
  dbCredentials: {
    url: `postgres://${config.dbUsername}:${config.dbPassword}@${config.postgresBaseHost}:5432/${config.dbName}`,
  },
})
