import "server-only";

import { getDb, type Database } from "@workflow/db";

export const db: Database = getDb();
