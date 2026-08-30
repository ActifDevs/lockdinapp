import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import { pinoHttp } from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { errorHandler } from "./lib/error-handler";
import globalAuthPolicy from "./middlewares/global-auth-policy";
import { generateRequestId, requestIdHeader } from "./middlewares/request-id";
import { initApiSentry } from "./lib/monitoring";

initApiSentry();

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    genReqId: generateRequestId,
    serializers: {
      req(req: Request) {
        return {
          id: (req as any).id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res: Response) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(requestIdHeader);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", globalAuthPolicy);
app.use("/api", router);
app.use(errorHandler);

export default app;
