<script lang="ts">
    import type { Snippet } from "svelte";

    let { children, checked = $bindable(), disabled = $bindable(false) }: { children: Snippet, checked: boolean, disabled?: boolean } = $props()
</script>

  <label class="label">
    <input type="checkbox" bind:checked {disabled} class="toggle" />
    {@render children()}
  </label>
