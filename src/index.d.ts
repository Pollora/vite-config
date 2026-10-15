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
    /**
     * `pollora` (default): a Pollora project, built under its public directory as build/<type>/<name>.
     * `standalone`: a classic theme, a plugin or a Bedrock site: built inside the package, into build/, with a hot file at its root.
     */
    layout?: 'pollora' | 'standalone';
    /** The project's public directory, relative to the package root; the package root itself (`.`) for a standalone layout */
    publicDirectory?: string;
    /** Standalone layout: the build directory, relative to the public directory (default `build`) */
    buildDirectory?: string;
    /** Standalone layout: the hot file, relative to the public directory (default `hot`) */
    hotFile?: string;
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

export function layoutOf(settings: {
    layout?: 'pollora' | 'standalone';
    type: 'theme' | 'plugin' | 'module';
    name: string;
    root: string;
    publicDirectory?: string;
    buildDirectory?: string;
    hotFile?: string;
}): { publicDirectory: string; buildDirectory: string; hotFile: string; base: string | null };

export function kebab(name: string): string;
export function blockEntries(root: string): Record<string, string>;
export function devServer(port: number): Record<string, unknown>;
