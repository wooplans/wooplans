import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

const config = [
  { ignores: [".next/**", ".open-next/**", "node_modules/**", "cloudflare-env.d.ts", "next-env.d.ts", "public/**", "scripts/**"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default config;
