import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/cron/followup-dispatch")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const secret = process.env.CRON_SECRET;
        if (!secret) {
          return new Response("CRON_SECRET não configurado", { status: 500 });
        }
        const supplied = request.headers.get("x-cron-secret")
          ?? request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
          ?? new URL(request.url).searchParams.get("secret");
        if (supplied !== secret) {
          return new Response("unauthorized", { status: 401 });
        }

        try {
          const { runFollowupDispatch } = await import("@/lib/followup-dispatch.server");
          const results = await runFollowupDispatch();
          return new Response(JSON.stringify({ ok: true, ...results }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (e: any) {
          return new Response(JSON.stringify({ ok: false, error: e?.message ?? String(e) }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
