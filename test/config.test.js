import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { build, resolveConfig } from 'vite';
import pollora, { kebab } from '../src/index.js';

// A project laid out like a Pollora site: the public directory each type expects
// Inside the package, so the fixture resolves tailwindcss from its node_modules
const scratch = path.join(import.meta.dirname, '.tmp');
fs.mkdirSync(scratch, { recursive: true });
const project = fs.mkdtempSync(path.join(scratch, 'project-'));
const roots = {
    theme: path.join(project, 'themes', 'starter'),
    plugin: path.join(project, 'public', 'content', 'plugins', 'acme-forms'),
    module: path.join(project, 'Modules', 'BlocksDemo'),
};

function write(file, content) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
}

before(() => {
    for (const env of ['DDEV_PRIMARY_URL', 'IS_DOCKER', 'DOCKER_ENV', 'APP_URL', 'VITE_PORT']) {
        delete process.env[env];
    }

    for (const root of Object.values(roots)) {
        write(path.join(root, 'resources/assets/app.js'), "import './app.css';\n");
        write(path.join(root, 'resources/assets/app.css'), '@import "tailwindcss";\n');
        write(path.join(root, 'resources/views/blocks/hero/index.jsx'), 'export default {};\n');
        write(path.join(root, 'resources/views/blocks/hero/view.js'), 'console.log("hero");\n');
        write(path.join(root, 'resources/views/blocks/hero/style.css'), '.hero { color: red; }\n');
        write(path.join(root, 'resources/views/blocks/hero/block.json'), '{}\n');
    }

    write(path.join(roots.theme, 'theme.json'), '{"version": 3, "settings": {}}\n');
});

after(() => {
    fs.rmSync(project, { recursive: true, force: true });
});

async function resolved(type, options = {}) {
    return resolveConfig({
        configFile: false,
        root: roots[type],
        logLevel: 'silent',
        plugins: [pollora({ type, root: roots[type], tailwind: false, ...options })],
    }, 'build');
}

describe('pollora()', () => {
    test('refuses an unknown type', () => {
        assert.throws(() => pollora({ type: 'widget' }), /"type" must be one of theme, plugin, module/);
    });

    test('kebab-cases a module directory like Str::kebab()', () => {
        assert.equal(kebab('BlocksDemo'), 'blocks-demo');
        assert.equal(kebab('Crm'), 'crm');
        assert.equal(kebab('SEOTools2'), 'seotools2');
    });

    const expected = {
        theme: { base: '/build/theme/starter/', outDir: 'public/build/theme/starter', port: 5173 },
        plugin: { base: '/build/plugin/acme-forms/', outDir: 'public/build/plugin/acme-forms', port: 5174 },
        module: { base: '/build/module/blocks-demo/', outDir: 'public/build/module/blocks-demo', port: 5175 },
    };

    for (const [type, { base, outDir, port }] of Object.entries(expected)) {
        test(`builds a ${type} where the framework serves it`, async () => {
            const config = await resolved(type);

            assert.equal(config.base, base);
            assert.equal(path.relative(project, path.resolve(config.root, config.build.outDir)), outDir);
            assert.equal(config.build.emptyOutDir, false);
            assert.equal(config.build.manifest, 'manifest.json');
            assert.equal(config.server.port, port);
            assert.equal(config.server.host, 'localhost');
            assert.ok(config.plugins.some((plugin) => plugin.name === 'pollora:blade-reload'));
        });
    }

    test('takes the app entry and every block script and stylesheet as inputs', async () => {
        const config = await resolved('plugin');
        const inputs = [config.build.rollupOptions.input].flat().map((file) => path.relative(roots.plugin, path.resolve(roots.plugin, file))).sort();

        assert.deepEqual(inputs, [
            'resources/assets/app.js',
            'resources/views/blocks/hero/index.jsx',
            'resources/views/blocks/hero/style.css',
            'resources/views/blocks/hero/view.js',
        ]);
    });

    test('leaves blocks out when asked to', async () => {
        const config = await resolved('plugin', { blocks: false });

        assert.deepEqual([config.build.rollupOptions.input].flat().map((file) => path.basename(file)), ['app.js']);
    });

    test('takes the port from VITE_PORT, and an explicit port over it', async () => {
        process.env.VITE_PORT = '5190';

        try {
            assert.equal((await resolved('module')).server.port, 5190);
            assert.equal((await resolved('module', { port: 5199 })).server.port, 5199);
        } finally {
            delete process.env.VITE_PORT;
        }
    });

    test('announces the site host inside DDEV', async () => {
        process.env.DDEV_PRIMARY_URL = 'https://acme.ddev.site';

        try {
            const { server } = await resolved('theme');

            assert.equal(server.host, '0.0.0.0');
            assert.equal(server.origin, 'https://acme.ddev.site:5173');
            assert.equal(server.hmr.protocol, 'wss');
            assert.equal(server.hmr.host, 'acme.ddev.site');
        } finally {
            delete process.env.DDEV_PRIMARY_URL;
        }
    });

    test('adds theme.json generation for a theme only', async () => {
        const names = async (type) => (await resolved(type)).plugins.map((plugin) => plugin.name);

        assert.ok((await names('theme')).some((name) => name.includes('theme-json')));
        assert.ok(!(await names('plugin')).some((name) => name.includes('theme-json')));
    });

    test('builds a module into public/build/module/<kebab> with its manifest', async () => {
        await build({
            configFile: false,
            root: roots.module,
            logLevel: 'silent',
            plugins: [pollora({ type: 'module', root: roots.module })],
        });

        const manifest = JSON.parse(fs.readFileSync(path.join(project, 'public/build/module/blocks-demo/manifest.json'), 'utf8'));

        assert.deepEqual(Object.keys(manifest).filter((key) => manifest[key].isEntry).sort(), [
            'resources/assets/app.js',
            'resources/views/blocks/hero/index.jsx',
            'resources/views/blocks/hero/style.css',
            'resources/views/blocks/hero/view.js',
        ]);
        assert.match(manifest['resources/assets/app.js'].file, /^assets\//);
    });
});
