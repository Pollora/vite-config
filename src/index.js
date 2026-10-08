import path from 'node:path';
import fs from 'node:fs';
import { globSync } from 'glob';
import laravel, { refreshPaths } from 'laravel-vite-plugin';

/**
 * Where each kind of Pollora package builds, relative to the project root, and
 * how far its own root sits below the project's public directory.
 */
const TYPES = {
    theme: {
        // themes/<name>
        publicDirectory: '../../public',
        port: 5173,
        reloadOn: ['.blade.php'],
        assets: ['resources/assets/images/**', 'resources/assets/fonts/**'],
    },
    plugin: {
        // public/content/plugins/<name>
        publicDirectory: '../../../../public',
        port: 5174,
        reloadOn: ['.blade.php', '.php'],
        assets: [],
    },
    module: {
        // Modules/<Name>
        publicDirectory: '../../public',
        port: 5175,
        reloadOn: ['.blade.php', '.php'],
        assets: [],
    },
};

const BLOCK_ENTRIES = [
    './resources/views/blocks/*/{index,view}.{js,jsx,ts,tsx}',
    './resources/views/blocks/*/{editor,style}.css',
];

const DEFAULT_INPUT = ['./resources/assets/app.js'];

/**
 * Turn a directory name into the slug the framework serves a module under:
 * BlocksDemo → blocks-demo, as Str::kebab() does.
 */
export function kebab(name) {
    return name
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .replace(/[\s_]+/g, '-')
        .toLowerCase();
}

/**
 * Vite entries of every block script and stylesheet, keyed by path so blocks
 * sharing a file name never overwrite each other.
 */
export function blockEntries(root) {
    return globSync(BLOCK_ENTRIES, { cwd: root, posix: true })
        .sort()
        .reduce((entries, file) => {
            entries[file.replace(/^\.\//, '').replace(/\.\w+$/, '')] = file;
            return entries;
        }, {});
}

function baseUrl() {
    return process.env.APP_URL || process.env.DDEV_PRIMARY_URL || 'http://localhost';
}

function isDocker() {
    return Boolean(process.env.IS_DOCKER || process.env.DOCKER_ENV || process.env.DDEV_PRIMARY_URL);
}

/**
 * Dev server reachable from the site: inside DDEV or Docker it listens on every
 * interface and announces the site's own host, elsewhere it serves localhost.
 */
export function devServer(port) {
    const url = baseUrl();
    const isHttps = url.startsWith('https');
    const hostname = new URL(url).hostname;
    const common = {
        port,
        strictPort: true,
        cors: {
            origin: '*',
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            credentials: true,
        },
    };

    if (isDocker()) {
        return {
            ...common,
            host: '0.0.0.0',
            origin: `${url}:${port}`,
            hmr: { protocol: isHttps ? 'wss' : 'ws', host: hostname },
        };
    }

    return {
        ...common,
        https: isHttps,
        host: isHttps ? hostname : 'localhost',
        hmr: { protocol: isHttps ? 'wss' : 'ws', host: hostname },
    };
}

function resolvePort(option, fallback) {
    const port = option ?? process.env.VITE_PORT;

    return port === undefined || port === '' ? fallback : Number(port);
}

/**
 * The Vite plugins a Pollora theme, plugin or module builds with.
 *
 * @param {import('./index').PolloraOptions} options
 * @returns {import('vite').PluginOption[]}
 */
export default function pollora(options = {}) {
    const type = options.type;

    if (!TYPES[type]) {
        throw new Error(`@pollora/vite-config: "type" must be one of ${Object.keys(TYPES).join(', ')}, got ${JSON.stringify(type)}.`);
    }

    const defaults = TYPES[type];
    const root = path.resolve(options.root ?? process.cwd());
    const directoryName = path.basename(root);
    const name = options.name ?? (type === 'module' ? kebab(directoryName) : directoryName);
    // Relative to the package root: laravel-vite-plugin strips a leading slash
    const publicDirectory = options.publicDirectory ?? defaults.publicDirectory;
    const buildDirectory = path.join('build', type, name);
    const base = `/build/${type}/${name}`;
    const port = resolvePort(options.port, defaults.port);

    const blocks = options.blocks === false ? {} : blockEntries(root);
    const hasBlocks = Object.keys(blocks).length > 0;
    const input = (options.input ?? DEFAULT_INPUT.filter((file) => fs.existsSync(path.join(root, file))));

    const reloadOn = defaults.reloadOn;
    const refresh = [
        // A literal resources/views/** turns every block JSX change into a full reload
        ...refreshPaths.filter((refreshPath) => refreshPath !== 'resources/views/**'),
        'resources/views/**/*.blade.php',
        ...(reloadOn.includes('.php') ? ['app/**/*.php'] : []),
        ...(options.refresh ?? []),
    ];

    const plugins = [
        {
            name: 'pollora:config',
            config: () => ({
                base,
                build: { emptyOutDir: false },
                server: devServer(port),
            }),
        },
    ];

    if (options.tailwind !== false) {
        plugins.push(import('@tailwindcss/vite').then((module) => module.default()));
    }

    plugins.push(laravel({
        input: [...input, ...Object.values(blocks)],
        publicDirectory,
        // Written from the working directory, unlike the build directory resolved from the root
        hotFile: path.resolve(root, publicDirectory, `${name}.hot`),
        buildDirectory,
        refresh,
        assets: options.assets ?? defaults.assets,
    }));

    if (type === 'theme' && options.themeJson !== false) {
        plugins.push(import('@roots/vite-plugin').then(({ wordpressThemeJson }) => wordpressThemeJson({
            baseThemeJsonPath: './theme.json',
            ...(options.themeJson ?? {}),
        })));
    }

    if (hasBlocks) {
        plugins.push(import('@roots/vite-plugin').then(({ wordpressPlugin }) => wordpressPlugin(options.wordpress ?? {})));
    }

    plugins.push({
        name: 'pollora:blade-reload',
        handleHotUpdate({ file, server }) {
            if (reloadOn.some((extension) => file.endsWith(extension))) {
                server.ws.send({ type: 'full-reload', path: '*' });
            }
        },
    });

    return plugins;
}

export { pollora };
