<script lang="ts">
    import Checkbox from "./Checkbox.svelte";

    class State {
        private _enabled = $state(true);
        private _pii = $state(true);

        get enabled() {
            return this._enabled;
        }

        set enabled(enabled: boolean) {
            this._enabled = enabled;
            this.saveSetting("enabled", enabled);
        }

        get pii() {
            return this._pii;
        }

        set pii(pii: boolean) {
            this._pii = pii;
            this.saveSetting("pii", pii);
        }

        private saveSetting(name: string, value: boolean) {
            browser.storage.sync.set({
                [name]: value
            })
        }

        constructor() {
            browser.storage.sync.get(["enabled", "pii"], (result) => {
                // Set default values if not found
                this._enabled =
                    result.enabled !== undefined ? result.enabled : true;
                this._pii = result.pii !== undefined ? result.pii : true;
            });
        }
    }

    const app_state = new State();
</script>

<div class="w-40">
    <navbar class="navbar bg-base-100 shadow-sm">
        <span class="text-xl font-bold">fyeo</span>
    </navbar>
    <main>
        <h2 class="text-lg text-center">settings</h2>
        <ul>
            <Checkbox bind:checked={app_state.enabled}>enabled</Checkbox>
            <Checkbox disabled={!app_state.enabled} bind:checked={app_state.pii}>hide personal info</Checkbox>
        </ul>
    </main>
</div>
