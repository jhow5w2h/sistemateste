import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

async function asaas(path: string, init: RequestInit = {}) {
  const r = await fetch(`${process.env.ASAAS_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "area42",
      access_token: process.env.ASAAS_API_KEY!,
    },
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.errors?.[0]?.description ?? `Asaas ${r.status}`);
  return data;
}

export const Route = createFileRoute("/api/asaas/criar-pix")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const admin = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { persistSession: false } },
          );

          // 1. quem está comprando
          const token = request.headers.get("authorization")?.replace("Bearer ", "");
          if (!token) return json({ error: "Faça login" }, 401);
          const { data: u } = await admin.auth.getUser(token);
          if (!u?.user) return json({ error: "Sessão inválida" }, 401);

          // 2. dados enviados
          const { orderId, cpf } = await request.json();
          const cpfNum = String(cpf ?? "").replace(/\D/g, "");
          if (cpfNum.length !== 11) return json({ error: "CPF inválido" }, 400);

          // 3. pedido (valor vem do banco, nunca do navegador)
          const { data: order } = await admin
            .from("orders")
            .select("id,user_id,total,status,payment_reference")
            .eq("id", orderId)
            .maybeSingle();
          if (!order || order.user_id !== u.user.id)
            return json({ error: "Pedido não encontrado" }, 404);
          if (order.status !== "aguardando_pagamento")
            return json({ error: "Pedido não está aguardando pagamento" }, 400);

          // 4. cria a cobrança (ou reaproveita a que já existe)
          let paymentId = order.payment_reference as string | null;
          if (!paymentId || !paymentId.startsWith("pay_")) {
            const { data: prof } = await admin
              .from("profiles")
              .select("full_name,email")
              .eq("id", u.user.id)
              .maybeSingle();

            const customer = await asaas("/customers", {
              method: "POST",
              body: JSON.stringify({
                name: prof?.full_name || "Cliente",
                email: prof?.email ?? u.user.email,
                cpfCnpj: cpfNum,
              }),
            });

            const due = new Date(Date.now() + 24 * 3600 * 1000)
              .toISOString()
              .slice(0, 10);
            const payment = await asaas("/payments", {
              method: "POST",
              body: JSON.stringify({
                customer: customer.id,
                billingType: "PIX",
                value: Number(order.total),
                dueDate: due,
                externalReference: order.id,
                description: "Ingresso ÁREA 42",
              }),
            });
            paymentId = payment.id;
            await admin
              .from("orders")
              .update({ payment_reference: paymentId })
              .eq("id", order.id);
          }

          // 5. QR Code
          const qr = await asaas(`/payments/${paymentId}/pixQrCode`);
          return json({
            paymentId,
            qrImage: qr.encodedImage, // base64 (PNG)
            copiaECola: qr.payload,
            expiresAt: qr.expirationDate,
          });
        } catch (e) {
          console.error("criar-pix", e);
          return json({ error: e instanceof Error ? e.message : "Erro" }, 500);
        }
      },
    },
  },
});
