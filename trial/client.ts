// ui-sdk-trial client: upgrades src/sdk.ts's markup. The agent bridge is put on window only on the probe page
// (?agent), to read what it exposes; nothing in the package does this.
import "@ui-sdk/web/tabs";
import "@ui-sdk/web/menu";
import "@ui-sdk/web/select";
import "@ui-sdk/web/alert-dialog";
import "@ui-sdk/web/input";
import { createAgent } from "@ui-sdk/web/agent";

if (new URLSearchParams(location.search).has("agent")) {
  (window as unknown as { agent: unknown }).agent = createAgent();
}
