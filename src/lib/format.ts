export const brl = (v: number | string) =>
  Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const dateBR = (d: string) => {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
};

export const dateTimeBR = (d: string) =>
  new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

export const waLink = (phone: string, msg: string) =>
  `https://wa.me/${phone.replace(/\D/g, "").replace(/^(?!55)/, "55")}?text=${encodeURIComponent(msg)}`;

export const errMsg = (e: unknown) =>
  e && typeof e === "object" && "message" in e ? String((e as { message: string }).message) : "Erro inesperado";
