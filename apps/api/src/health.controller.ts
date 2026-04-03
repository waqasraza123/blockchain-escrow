import { Controller, Get } from "@nestjs/common";

@Controller("health")
export class HealthController {
  @Get("live")
  getLive() {
    return {
      service: "api",
      status: "ok"
    };
  }

  @Get("ready")
  getReady() {
    return {
      service: "api",
      status: "ready"
    };
  }
}
