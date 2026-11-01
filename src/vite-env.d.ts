// Tells TypeScript which variables exist in import.meta.env.
// Only variables prefixed with VITE_ are exposed to the client by Vite.
interface ImportMetaEnv {
  readonly VITE_API_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
