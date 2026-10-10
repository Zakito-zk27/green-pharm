import { describe, expect, it } from "vitest";
import { DEFAULT_RATES, seedProducts } from "./defaults";
import { isOfferActive, priceCart, type PriceData, type PriceInput } from "./pricing";
import type { Offer } from "./types";

const products = seedProducts("2026-01-01T00:00:00Z");
const offer = (o: Partial<Offer>): Offer => ({
  id: "x",
  name: "offer",
  desc: "",
  type: "percent",
  value: 10,
  code: "",
  minTotal: 0,
  firstOnly: false,
  on: true,
  startsAt: "",
  endsAt: "",
  ...o,
});
const data = (offers: Offer[] = [], freeShip = 6000): PriceData => ({
  products,
  rates: DEFAULT_RATES,
  offers,
  freeShip,
});
const input = (p: Partial<PriceInput>): PriceInput => ({
  lines: [{ productId: 1, variantId: "v1", qty: 1 }],
  wilaya: 16,
  mode: "home",
  coupon: "",
  firstOrder: false,
  now: new Date("2026-06-15T12:00:00"),
  ...p,
});

describe("priceCart", () => {
  it("uses database prices and the wilaya's delivery rate", () => {
    const r = priceCart(input({}), data());
    expect(r.subtotal).toBe(2700);
    expect(r.shipping).toBe(450); // Alger, home (prototype test rates)
    expect(r.total).toBe(3150);
  });

  it("uses the desk price for stop-desk delivery", () => {
    expect(priceCart(input({ mode: "desk" }), data()).shipping).toBe(300);
  });

  it("has no shipping until a wilaya is chosen", () => {
    const r = priceCart(input({ wilaya: null }), data());
    expect(r.shipping).toBeNull();
    expect(r.total).toBe(2700);
  });

  it("gives free shipping from the threshold", () => {
    const r = priceCart(input({ lines: [{ productId: 8, variantId: "v1", qty: 1 }] }), data()); // 9800 DA
    expect(r.shipping).toBe(0);
  });

  it("ignores unknown products and refuses out-of-stock ones", () => {
    const r = priceCart(
      input({
        lines: [
          { productId: 999, variantId: "v1", qty: 1 },
          { productId: 6, variantId: "v1", qty: 1 },
        ],
      }),
      data(),
    );
    expect(r.items).toHaveLength(0);
    expect(r.problems.map((p) => p.kind)).toEqual(["unknown", "out"]);
  });

  it("caps quantities at the stock", () => {
    const r = priceCart(input({ lines: [{ productId: 2, variantId: "v1", qty: 50 }] }), data()); // 6 in stock
    expect(r.items[0].qty).toBe(6);
    expect(r.problems[0].kind).toBe("reduced");
  });

  it("never trusts a price sent by the browser", () => {
    const tampered = {
      productId: 1,
      variantId: "v1",
      qty: 1,
      price: 1,
    } as unknown as PriceInput["lines"][number];
    expect(priceCart(input({ lines: [tampered] }), data()).subtotal).toBe(2700);
  });

  it("applies a percent coupon only with the right code", () => {
    const offers = [offer({ code: "SAVE10", value: 10 })];
    expect(priceCart(input({}), data(offers)).discount).toBe(0);
    const ok = priceCart(input({ coupon: "save10" }), data(offers));
    expect(ok.coupon).toBe("ok");
    expect(ok.discount).toBe(270);
    expect(priceCart(input({ coupon: "NOPE" }), data(offers)).coupon).toBe("invalid");
  });

  it("applies first-order offers only to a first order", () => {
    const offers = [offer({ code: "WELCOME15", value: 15, firstOnly: true })];
    expect(priceCart(input({ coupon: "WELCOME15", firstOrder: false }), data(offers)).coupon).toBe(
      "invalid",
    );
    expect(priceCart(input({ coupon: "WELCOME15", firstOrder: true }), data(offers)).discount).toBe(
      405,
    );
  });

  it("buy 2 get the 3rd free: the cheapest unit of each group of 3", () => {
    const offers = [offer({ type: "b2g1" })];
    const r = priceCart(
      input({
        lines: [
          { productId: 1, variantId: "v1", qty: 2 },
          { productId: 4, variantId: "v1", qty: 1 },
        ],
      }), // 2700 ×2 + 2300
      data(offers),
    );
    expect(r.discount).toBe(2300);
    expect(r.items.find((i) => i.productId === 4)?.free).toBe(1);
    expect(
      priceCart(input({ lines: [{ productId: 1, variantId: "v1", qty: 2 }] }), data(offers))
        .discount,
    ).toBe(0);
  });

  it("fixed amount respects the minimum and never goes below zero", () => {
    const offers = [offer({ type: "amount", value: 5000, minTotal: 2000 })];
    const r = priceCart(input({}), data(offers));
    expect(r.discount).toBe(2700);
    expect(r.total).toBe(450);
    expect(
      priceCart(
        input({ lines: [{ productId: 4, variantId: "v1", qty: 0 }] }),
        data([offer({ type: "amount", value: 500, minTotal: 3000 })]),
      ).discount,
    ).toBe(0);
  });

  it("free-shipping offer with a minimum", () => {
    const offers = [offer({ type: "freeship", minTotal: 2500 })];
    expect(priceCart(input({}), data(offers)).shipping).toBe(0);
    expect(
      priceCart(input({ lines: [{ productId: 4, variantId: "v1", qty: 1 }] }), data(offers))
        .shipping,
    ).toBe(450);
  });

  it("skips disabled and expired offers", () => {
    const now = new Date("2026-06-15T12:00:00");
    expect(isOfferActive(offer({ on: false }), now)).toBe(false);
    expect(isOfferActive(offer({ endsAt: "2026-06-14" }), now)).toBe(false);
    expect(isOfferActive(offer({ startsAt: "2026-06-16" }), now)).toBe(false);
    expect(isOfferActive(offer({ startsAt: "2026-06-15", endsAt: "2026-06-15" }), now)).toBe(true);
  });
});
