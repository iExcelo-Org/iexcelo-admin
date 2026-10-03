import type { Robots } from "next/dist/lib/metadata/types/metadata-types";

export const ADMIN_BASE_URL = "https://admin.iexcelo.com";

export const ADMIN_SITE_NAME = "iExcelo Admin";

export const ADMIN_OG_IMAGE = {
  url: `${ADMIN_BASE_URL}/seo/open-graph.png`,
  width: 1200,
  height: 630,
  alt: "iExcelo Admin Panel",
} as const;

export const ADMIN_ROBOTS: Robots = {
  index: false,
  follow: false,
  googleBot: { index: false, follow: false },
};
