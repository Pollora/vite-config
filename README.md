# @pollora/vite-config

The Vite configuration shared by [Pollora](https://pollora.dev) themes, plugins and modules: where each one builds, its hot file, a dev server that works inside DDEV or Docker, its Gutenberg blocks, Tailwind CSS v4 and a page reload on Blade changes.

```js
// vite.config.js
import { defineConfig } from 'vite';
import pollora from '@pollora/vite-config';

export default defineConfig({
    plugins: [pollora({ type: 'module' })],
});
```

It is a dev dependency of each theme, plugin or module, like `laravel-vite-plugin`. Nothing is shared at build time: each package keeps its own `package.json`, build and hot file, and pins its own version.

## What `type` sets

| `type` | Build directory (served by the framework) | Hot file | Default port | Extra |
| --- | --- | --- | --- | --- |
| `theme` | `public/build/theme/<name>` | `public/<name>.hot` | 5173 | `theme.json` generated from the `@theme` tokens (`wordpressThemeJson`) |
| `plugin` | `public/build/plugin/<name>` | `public/<name>.hot` | 5174 | Page reload on `.php` changes |
| `module` | `public/build/module/<kebab-name>` | `public/<kebab-name>.hot` | 5175 | Page reload on `.php` changes |

`<name>` is the directory name (`Modules/BlocksDemo` → `blocks-demo` for a module).

## Options

| Option | Default | |
| --- | --- | --- |
| `type` | required | `theme`, `plugin` or `module` |
| `name` | directory name | Name the build is served under |
| `input` | `resources/assets/app.js` when it exists | Entries besides blocks |
| `blocks` | `true` | Build `resources/views/blocks/*/{index,view}.{js,jsx,ts,tsx}` and `{editor,style}.css`, and add `@roots/vite-plugin`'s `wordpressPlugin` |
| `tailwind` | `true` | Add `@tailwindcss/vite` |
| `themeJson` | `{ baseThemeJsonPath: './theme.json' }` | Options for `wordpressThemeJson` (themes), or `false` |
| `wordpress` | `{}` | Options for `wordpressPlugin` |
| `port` | `VITE_PORT`, else the type's port | Dev server port |
| `refresh` | `[]` | Extra paths that reload the page |
| `assets` | theme: `resources/assets/{images,fonts}/**` | Static assets copied to the build |
| `publicDirectory` | the project's `public/`, relative to the package | |
| `root` | working directory | Package root |

## Requirements

Node 20.19+, `vite` 7 or 8, `laravel-vite-plugin` 2 or 3. `@tailwindcss/vite` and `@roots/vite-plugin` are needed when Tailwind CSS, blocks or `theme.json` generation are on.

## License

MIT, © [RuBee group](https://rubee.group).
