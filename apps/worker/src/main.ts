import { createServer } from "node:http";

const port = Number(process.env.WORKER_PORT ?? 4100);

const server = createServer((request, response) => {
  if (request.url === "/health/live" || request.url === "/health/ready") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ service: "worker", status: "ok" }));
    return;
  }

  response.writeHead(404, { "content-type": "application/json" });
  response.end(JSON.stringify({ service: "worker", status: "not_found" }));
});

server.listen(port, () => {
  console.log(`worker scaffold listening on ${port}`);
});
