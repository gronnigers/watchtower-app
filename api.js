// Watchtower — API the PWA calls (Phase 02a)
// Three small HTTP endpoints, all under /api. Secured with a function key for
// now; Phase 02c puts Entra login in front via Static Web Apps.

const { app } = require("@azure/functions");
const { TableClient, odata } = require("@azure/data-tables");

function table(name) {
  return TableClient.fromConnectionString(process.env.AzureWebJobsStorage, name);
}

// GET /api/alerts?category=admin
// Lists alerts newest-first (row keys already sort that way).
app.http("getAlerts", {
  methods: ["GET"],
  authLevel: "function",
  route: "alerts",
  handler: async (req, context) => {
    const alerts = table("Alerts");
    try {
      await alerts.createTable();
    } catch (e) {
      /* exists */
    }

    const category = req.query.get("category");
    // Only allow simple category names; reject anything that could alter the query.
    if (category && !/^[A-Za-z0-9_-]{1,64}$/.test(category)) {
      return { status: 400, jsonBody: { error: "invalid category" } };
    }
    const options = category
      ? { queryOptions: { filter: odata`PartitionKey eq ${category}` } }
      : undefined;

    const items = [];
    for await (const e of alerts.listEntities(options)) {
      items.push({
        id: e.activityId,
        partitionKey: e.partitionKey,
        rowKey: e.rowKey,
        category: e.partitionKey,
        severity: e.severity,
        title: e.title,
        actor: e.actor,
        target: e.target,
        source: e.source,
        createdUtc: e.createdUtc,
        state: e.state || "open",
      });
      if (items.length >= 100) break;
    }
    return { jsonBody: { count: items.length, alerts: items } };
  },
});

// POST /api/ack   body: { partitionKey, rowKey, kind: "safe" | "ack" }
// Marks an alert acknowledged / safe (updates state on the row).
app.http("ackAlert", {
  methods: ["POST"],
  authLevel: "function",
  route: "ack",
  handler: async (req, context) => {
    const { partitionKey, rowKey, kind } = await req.json();
    if (!partitionKey || !rowKey) {
      return { status: 400, jsonBody: { error: "partitionKey and rowKey required" } };
    }
    const alerts = table("Alerts");
    await alerts.updateEntity(
      {
        partitionKey,
        rowKey,
        state: kind === "safe" ? "safe" : "acknowledged",
        ackedUtc: new Date().toISOString(),
      },
      "Merge"
    );
    return { jsonBody: { ok: true } };
  },
});

// POST /api/push/subscribe   body: a browser PushSubscription
// Stores this device so we can push to it.
app.http("subscribePush", {
  methods: ["POST"],
  authLevel: "function",
  route: "push/subscribe",
  handler: async (req, context) => {
    const sub = await req.json();
    if (!sub || !sub.endpoint || !sub.keys) {
      return { status: 400, jsonBody: { error: "invalid subscription" } };
    }
    const subs = table("PushSubs");
    try {
      await subs.createTable();
    } catch (e) {
      /* exists */
    }
    // Stable id from the endpoint so the same device doesn't duplicate.
    const id = Buffer.from(sub.endpoint)
      .toString("base64")
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 200);
    await subs.upsertEntity(
      {
        partitionKey: "sub",
        rowKey: id,
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
        addedUtc: new Date().toISOString(),
      },
      "Replace"
    );
    return { jsonBody: { ok: true } };
  },
});
