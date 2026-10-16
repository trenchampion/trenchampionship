import { db } from "ponder:api";
import schema from "ponder:schema";
import { Hono } from "hono";
import { client, graphql } from "ponder";

/**
 * GraphQL at /graphql (and / for the playground), plus the Ponder SQL client at /sql for the
 * web app's typed queries. Nothing here writes anywhere.
 */
const app = new Hono();

app.use("/sql/*", client({ db, schema }));
app.use("/", graphql({ db, schema }));
app.use("/graphql", graphql({ db, schema }));

export default app;
