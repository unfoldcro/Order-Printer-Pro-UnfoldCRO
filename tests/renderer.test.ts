import { describe, it, expect } from "vitest";
import { renderTemplate, buildOrderData } from "../app/lib/renderer.server";

const SAMPLE_RAW_ORDER = {
  name: "#1001",
  createdAt: "2024-01-15T10:00:00Z",
  email: "test@example.com",
  totalPriceSet: { shopMoney: { amount: "99.00", currencyCode: "USD" } },
  subtotalPriceSet: { shopMoney: { amount: "89.00" } },
  totalTaxSet: { shopMoney: { amount: "8.00" } },
  totalShippingPriceSet: { shopMoney: { amount: "2.00" } },
  customer: { firstName: "Jane", lastName: "Doe", email: "jane@example.com" },
  shippingAddress: {
    address1: "123 Main St", address2: "", city: "NYC", province: "NY", zip: "10001", country: "US",
  },
  lineItems: {
    edges: [
      { node: { title: "Widget", quantity: 2, originalUnitPrice: "44.50", sku: "W1", variantTitle: "Red" } },
    ],
  },
};

describe("buildOrderData", () => {
  it("maps raw order fields correctly", () => {
    const data = buildOrderData(SAMPLE_RAW_ORDER);
    expect(data.name).toBe("#1001");
    expect(data.customer.email).toBe("jane@example.com");
    expect(data.lineItems).toHaveLength(1);
    expect(data.lineItems[0].title).toBe("Widget");
    expect(data.totalPrice).toBe("99.00");
  });

  it("handles missing optional fields gracefully", () => {
    const data = buildOrderData({ name: "#1002", lineItems: { edges: [] } });
    expect(data.name).toBe("#1002");
    expect(data.customer.email).toBe("");
    expect(data.shippingAddress).toBeNull();
    expect(data.lineItems).toHaveLength(0);
  });
});

describe("renderTemplate", () => {
  it("renders order tokens correctly", () => {
    const data = buildOrderData(SAMPLE_RAW_ORDER);
    const html = renderTemplate("<h1>{{order.name}}</h1>", "", data);
    expect(html).toContain("#1001");
  });

  it("renders lineItems loop", () => {
    const data = buildOrderData(SAMPLE_RAW_ORDER);
    const html = renderTemplate("{{#each order.lineItems}}<p>{{title}}</p>{{/each}}", "", data);
    expect(html).toContain("Widget");
  });

  it("renders empty string for missing fields", () => {
    const data = buildOrderData({ name: "#1003", lineItems: { edges: [] } });
    const html = renderTemplate("{{order.customer.firstName}}", "", data);
    expect(html).not.toContain("undefined");
  });

  it("includes CSS in output", () => {
    const data = buildOrderData(SAMPLE_RAW_ORDER);
    const html = renderTemplate("<p>test</p>", "body { color: red; }", data);
    expect(html).toContain("body { color: red; }");
  });
});
