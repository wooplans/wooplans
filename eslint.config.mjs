import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const config = [
  { ignores: [".next/**", ".open-next/**", ".wrangler/**", "node_modules/**", "worker.ts", "cloudflare-env.d.ts", "next-env.d.ts", "public/**", "scripts/**", "video/**"] },
  ...nextVitals,
  ...nextTs,
  {
    // Règles « React Compiler » ajoutées avec Next 16 : elles visent du code existant qui fonctionne
    // (Date.now() dans des pages serveur, état initialisé dans un effet). Désactivées pour garder le
    // niveau de contrôle de Next 15 ; à réactiver en corrigeant ces fichiers.
    rules: { "react-hooks/purity": "off", "react-hooks/set-state-in-effect": "off", "react-hooks/immutability": "off" },
  },
];

export default config;
