import { createServer } from "node:http";

import { loadWorkerConfig } from "./config";
import { HealthState } from "./health-state";
import { WorkerService } from "./worker-service";

async function main(): Promise<void> {
  const config = loadWorkerConfig();
  const healthState = new HealthState();
  const workerService = new WorkerService(config, healthState);

  const shutdown = async () => {
    await workerService.close();
  };

  if (config.runOnce) {
    await workerService.start();
    await shutdown();
    return;
  }

  const server = createServer((request, response) => {
    if (request.url === "/health/live") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ service: "worker", status: "ok" }));
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
    response.end(JSON.stringify({ service: "worker", status: "not_found" }));
  });

  const shutdownWithServer = async () => {
    server.close();
    await shutdown();
    process.exit(0);
  };

  process.on("SIGINT", () => {
    void shutdownWithServer();
  });
  process.on("SIGTERM", () => {
    void shutdownWithServer();
  });

  server.listen(config.port, () => {
    console.log(`worker listening on ${config.port}`);
  });

  await workerService.start();
}

void main().catch((error) => {
  console.error("Worker startup failed", error);
  process.exit(1);
});
