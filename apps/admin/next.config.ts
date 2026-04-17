import type { NextConfig } from "next";

import { validateAdminStartupConfiguration } from "./startup";

validateAdminStartupConfiguration();

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.lvh.me"]
};

export default nextConfig;
