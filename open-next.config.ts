// Main site: no server-side cache. Every page is rendered fresh with live data on each request.
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig();
