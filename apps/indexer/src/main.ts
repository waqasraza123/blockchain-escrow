import { createServer } from "node:http";

import { loadIndexerConfig } from "./config";
import { HealthState } from "./health-state";
import { IndexerService } from "./indexer-service";

async function main(): Promise<void> {
  const config = loadIndexerConfig();
  const healthState = new HealthState();
  const indexerService = new IndexerService(config, healthState);

  const server = createServer((request, response) => {
    if (request.url === "/health/live") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ service: "indexer", status: "ok" }));
      return;
    }

    if (request.url === "/health/ready") {
      const snapshot = healthState.snapshot();
      response.writeHead(snapshot.ready ? 200 : 503, {
        "content-type": "application/json"
      });
      response.end(JSON.stringify(snapshot));
      return;
    }

    response.writeHead(404, { "content-type": "application/json" });
    response.end(JSON.stringify({ service: "indexer", status: "not_found" }));
  });

  const shutdown = async () => {
    server.close();
    await indexerService.close();
    process.exit(0);
  };

  process.on("SIGINT", () => {
    void shutdown();
  });
  process.on("SIGTERM", () => {
    void shutdown();
  });

  server.listen(config.port, () => {
    console.log(`indexer listening on ${config.port}`);
  });

  await indexerService.start();
}

void main().catch((error) => {
  console.error("Indexer startup failed", error);
  process.exit(1);
});
