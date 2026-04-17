import type { NextConfig } from "next";

import { validateWebStartupConfiguration } from "./startup";

validateWebStartupConfiguration();

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.lvh.me"]
};

export default nextConfig;
