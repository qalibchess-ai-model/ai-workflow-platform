import { registerBuiltinNodes } from "@workflow/workflow";

import { registerGmailNodes } from "./providers/gmail/nodes";
import { registerHubspotNodes } from "./providers/hubspot/nodes";
import { registerNotionNodes } from "./providers/notion/nodes";
import { registerSlackNodes } from "./providers/slack/nodes";
import { registerSupabaseNodes } from "./providers/supabase/nodes";
import { registerTelegramNodes } from "./providers/telegram/nodes";

export function registerAllNodes(): void {
  registerBuiltinNodes();
  registerGmailNodes();
  registerTelegramNodes();
  registerNotionNodes();
  registerSupabaseNodes();
  registerSlackNodes();
  registerHubspotNodes();
}
