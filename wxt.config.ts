import { defineConfig } from "wxt";
import tailwindcss from '@tailwindcss/vite';

// See https://wxt.dev/api/config.html
export default defineConfig({
    srcDir: "src",
    modules: ["@wxt-dev/module-svelte", "@wxt-dev/auto-icons"],
    manifest: {
        permissions: ['activeTab', 'tabs', 'storage'],
    },
    vite: () => ({
        plugins: [tailwindcss()]
    }),
    svelte: {
        vite: {
            compilerOptions: {
                customElement: true,
            },
        },
    },
});
