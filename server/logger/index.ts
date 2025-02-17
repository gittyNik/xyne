import { levels, pino, type Logger } from "pino"
import { Subsystem } from "@/types"
import type { MiddlewareHandler, Context, Next } from "hono"
import { getPath } from "hono/utils/url"
import { v4 as uuidv4 } from "uuid"

const humanize = (times: string[]) => {
  const [delimiter, separator] = [",", "."]

  const orderTimes = times.map((v) =>
    v.replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1" + delimiter),
  )

  return orderTimes.join(separator)
}

const time = (start: number) => {
  const delta = Date.now() - start
  return humanize([
    delta < 1000 ? delta + "ms" : Math.round(delta / 1000) + "s",
  ])
}

export const getLogger = (loggerType: Subsystem) => {
  if (process.env.NODE_ENV === "production") {
    return pino({
      name: `${loggerType}`,
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
          colorizeObjects: true,
          errorLikeObjectKeys: [
            "err",
            "error",
            "error_stack",
            "stack",
            "apiErrorHandlerCallStack",
          ],
        },
      },
    })
  } else {
    return pino({
      name: `${loggerType}`,
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
          colorizeObjects: true,
          errorLikeObjectKeys: [
            "err",
            "error",
            "error_stack",
            "stack",
            "apiErrorHandlerCallStack",
          ],
          ignore: "pid,hostname",
        },
      },
    })
  }
}

export const LogMiddleware = (loggerType: Subsystem): MiddlewareHandler => {
  const logger = getLogger(loggerType)

  return async (c: Context, next: Next, optionalMessage?: object) => {
    const requestId = uuidv4()
    const c_reqId = "requestId" in c.req ? c.req.requestId : requestId
    c.set("requestId", c_reqId)
    const { method } = c.req
    const path = getPath(c.req.raw)

    logger.info(
      {
        requestId: c_reqId,
        request: {
          method,
          path,
        },
        query: c.req.query("query")
          ? c.req.query("query")
          : c.req.query("prompt"),
      },
      "Incoming request",
    )

    const start = Date.now()

    await next()

    const { status } = c.res

    const elapsed: string = time(start)
    if (c.res.ok) {
      logger.info(
        {
          requestId: "requestId" in c.req ? c.req.requestId : c_reqId,
          response: {
            status,
            ok: String(c.res.ok),
            elapsed,
          },
        },
        "Request completed",
      )
    } else if (c.res.status >= 400) {
      logger.error(
        {
          requestId: c_reqId,
          response: {
            status,
            err: c.res.body,
            elapsed,
          },
        },
        "Request Error",
      )
    } else if (c.res.status === 302) {
      logger.info(
        {
          requestId: c_reqId,
          response: {
            status,
            elapsed,
          },
        },
        "Request redirected",
      )
    } else {
      logger.info(
        {
          requestId: c_reqId,
          response: {
            status,
            elapsed,
          },
        },
        "Request completed",
      )
    }
  }
}
