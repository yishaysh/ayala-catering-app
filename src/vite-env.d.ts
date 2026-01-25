
// Removed reference to vite/client to avoid type definition error in this environment
// /// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_ADMIN_PIN?: string;
  readonly VITE_GEMINI_API_KEY?: string;
  [key: string]: any;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface AIStudio {
  hasSelectedApiKey: () => Promise<boolean>;
  openSelectKey: () => Promise<void>;
}

interface Window {
  aistudio?: AIStudio;
}
