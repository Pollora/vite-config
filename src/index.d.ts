import type { PluginOption } from 'vite';

export interface PolloraOptions {
    /** What is being built: sets the build directory, hot file and default port */
    type: 'theme' | 'plugin' | 'module';
    /** Name it is served under (build/<type>/<name>); defaults to the directory name, kebab-cased for a module */
    name?: string;
    /** Package root; defaults to the current working directory */
    root?: string;
    /** Entries besides blocks; defaults to resources/assets/app.js when it exists */
    input?: string[];
    /** The project's public directory, relative to the package root */
    publicDirectory?: string;
    /** Dev server port; defaults to VITE_PORT, else 5173 (theme), 5174 (plugin), 5175 (module) */
    port?: number;
    /** Build the blocks in resources/views/blocks (default true) */
    blocks?: boolean;
    /** Add @tailwindcss/vite (default true) */
    tailwind?: boolean;
    /** Options for @roots/vite-plugin's wordpressThemeJson, or false to skip it (themes only) */
    themeJson?: Record<string, unknown> | false;
    /** Options for @roots/vite-plugin's wordpressPlugin, used when there are blocks */
    wordpress?: Record<string, unknown>;
    /** File endings that reload the whole page in development; .blade.php for themes, plus .php for plugins and modules */
    reloadOn?: string[];
    /** Extra paths that reload the page in development */
    refresh?: string[];
    /** Static assets copied to the build (laravel-vite-plugin's assets option) */
    assets?: string[];
}

export default function pollora(options: PolloraOptions): PluginOption[];
export { pollora };

export function kebab(name: string): string;
export function blockEntries(root: string): Record<string, string>;
export function devServer(port: number): Record<string, unknown>;
