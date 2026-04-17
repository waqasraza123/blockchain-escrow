import "reflect-metadata";

import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module";
import { validateApiStartupConfiguration } from "./startup";

async function bootstrap() {
  validateApiStartupConfiguration();

  const app = await NestFactory.create(AppModule);
  const port = Number(process.env.API_PORT ?? 4000);

  await app.listen(port);
}

void bootstrap().catch((error: unknown) => {
  console.error("API startup failed", error);
  process.exitCode = 1;
});
