import { createServer } from "node:http";

const port = Number(process.env.INDEXER_PORT ?? 4200);

const server = createServer((request, response) => {
  if (request.url === "/health/live" || request.url === "/health/ready") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ service: "indexer", status: "ok" }));
    return;
  }

  response.writeHead(404, { "content-type": "application/json" });
  response.end(JSON.stringify({ service: "indexer", status: "not_found" }));
});

server.listen(port, () => {
  console.log(`indexer scaffold listening on ${port}`);
});
