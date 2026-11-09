import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import("next").NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,

  // The /api/proxy rewrite below gives up on a request after 30 s by default (a 500 "Internal Server Error").
  // Bulk operations such as master imports legitimately take longer than that.
  experimental: {
    proxyTimeout: 10 * 60 * 1000,
  },

  transpilePackages: [
    "devextreme",
    "devextreme-react",
  ],

  async rewrites() {
    const apiBaseUrl =
      process.env.API_BASE_URL ?? "http://127.0.0.1:5000";

    return [
      {
        source: "/api/proxy/:path*",
        destination: `${apiBaseUrl}/api/:path*`,
      },
      {
        source: "/uploads/:path*",
        destination: `${apiBaseUrl}/uploads/:path*`,
      },
    ];
  },
};

export default withNextIntl(nextConfig);