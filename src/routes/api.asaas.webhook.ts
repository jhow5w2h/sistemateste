import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export const Route = createFileRoute("/api/asaas/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (request.headers.get("asaas-access-token") !== process.env.ASAAS_WEBHOOK_TOKEN)
          return new Response("unauthorized", { status: 401 });

        const body = await request.json().catch(() => null);
        const p = body?.payment;
        if (
          !["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"].includes(body?.event) ||
          !p?.externalReference
        )
          return json({ ok: true, ignored: true });

        const admin = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { persistSession: false } },
        );

        const { data: order } = await admin
          .from("orders")
          .select("id,total")
          .eq("id", p.externalReference)
          .maybeSingle();
        if (!order) return json({ ok: true, ignored: "pedido não existe" });

        // confere o valor pago contra o valor do pedido
        if (Number(p.value) < Number(order.total)) {
          console.error("valor menor que o pedido", p.id);
          return json({ ok: true, ignored: "valor menor" });
        }

        const { error } = await admin.rpc("mark_order_paid_system", {
          _order_id: order.id,
          _payment_ref: p.id,
        });
        if (error) {
          console.error("mark_order_paid_system", error);
          return json({ error: error.message }, 500);
        }
        return json({ ok: true });
      },
    },
  },
});
