/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // @chenglou/pretext ships ESM-only ("type": "module"). Next's webpack build
  // needs it transpiled or the client chunk gets an undefined module factory
  // (hydration crash: "originalFactory is undefined").
  transpilePackages: ["@chenglou/pretext"],
};

export default nextConfig;
