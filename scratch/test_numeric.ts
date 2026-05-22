import { numeric } from "drizzle-orm/sqlite-core";
const testNumeric = numeric("test");
type TestNumeric = typeof testNumeric.$inferSelect;
