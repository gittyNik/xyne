import { Models } from "@/ai/types"

let vespaBaseHost = "0.0.0.0"
let postgresBaseHost = "0.0.0.0"
let port = 3000
let host = "http://localhost:3000"
let dbUsername = "postgres"
let dbPassword = "postgres"
let dbName = "xyne"
let redirectUri = process.env.GOOGLE_REDIRECT_URI!
let postOauthRedirect = "/"
if (process.env.NODE_ENV === "production") {
  postgresBaseHost = process.env.DATABASE_HOST!
  vespaBaseHost = process.env.VESPA_HOST!
  port = parseInt(process.env.PORT!, 10) || 80
  dbUsername = process.env.DATABASE_USER!
  dbPassword = process.env.DATABASE_PASSWORD!
  dbName = process.env.DATABASE_NAME!
  host = process.env.HOST!
  redirectUri = process.env.GOOGLE_PROD_REDIRECT_URI!
}
// Adding this since in dev mode the vite FE is hosted on localhost:5173,
// but server does auth using localhost:3000, so we need to manually redirect to the correct address post oauth
if (process.env.NODE_ENV !== "production") {
  postOauthRedirect = "http://localhost:5173/"
}
let defaultFastModel: Models = "" as Models
let defaultBestModel: Models = "" as Models
let bedrockSupport = false
let AwsAccessKey = ""
let AwsSecretKey = ""
let OpenAIKey = ""
let OllamaModel = ""

// Priority (AWS > OpenAI > Ollama)
if (process.env["AWS_ACCESS_KEY"] && process.env["AWS_SECRET_KEY"]) {
  AwsAccessKey = process.env["AWS_ACCESS_KEY"]
  AwsSecretKey = process.env["AWS_SECRET_KEY"]
  bedrockSupport = true
  defaultFastModel = Models.Claude_3_5_Haiku
  defaultBestModel = Models.Claude_3_5_SonnetV2
} else if (process.env["OPENAI_API_KEY"]) {
  OpenAIKey = process.env["OPENAI_API_KEY"]
  defaultFastModel = Models.Gpt_4o_mini
  defaultBestModel = Models.Gpt_4o
} else if (process.env["OLLAMA_MODEL"]) {
  OllamaModel = process.env["OLLAMA_MODEL"]
  defaultFastModel = OllamaModel as Models
  defaultBestModel = OllamaModel as Models
}

export default {
  // default page size for regular search
  page: 8,
  // default page size for default search over answers
  answerPage: 12,
  // the max token length of input tokens before
  // we clean up using the metadata
  maxTokenBeforeMetadataCleanup: 3000,
  JwtPayloadKey: "jwtPayload",
  vespaBaseHost,
  postgresBaseHost,
  dbUsername,
  dbPassword,
  dbName,
  port,
  host,
  bedrockSupport,
  AwsAccessKey,
  AwsSecretKey,
  OpenAIKey,
  OllamaModel,
  redirectUri,
  postOauthRedirect,
  // update user query session time
  userQueryUpdateInterval: 60000, // 1 minute in milliseconds
  defaultBestModel,
  defaultFastModel,
  vespaMaxRetryAttempts: 3,
  vespaRetryDelay: 1000, // 1 sec
  chatHistoryPageSize: 21,
  maxDefaultSummary: 8,
}
