<script lang="ts">
    import "./Redacted.css";
    import type { Snippet } from "svelte";

    const { children, length }: { children: Snippet<[]>; length: number } =
        $props();

    function generateNoisePattern() {
        const chars =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?";
        let noise = "";
        for (let i = 0; i < length; i++) {
            noise += chars[Math.floor(Math.random() * chars.length)];
        }
        return noise;
    }

    let hide = $state(true);
    export function setHide(value: boolean) {
        hide = value;
    }

    function onclick(e: MouseEvent) {
        if (e.detail === 4) {
            hide = !hide;
        }
    }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<span
    {onclick}
    class={[
        "border rounded-sm border-black transition-all duration-75 hover:animate-pulse hover:scale-150",
        hide &&
            "blur-md select-none font-bold inline cursor-pointer bg-gradient-to-bl from-blue-300/60 to-purple-300/60",
    ]}
>
    {#if !hide}
        {@render children()}
    {:else}
        {generateNoisePattern()}
    {/if}
</span>
