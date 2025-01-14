import { BatchOrderPattern, OrderParams } from "../actions/actions.types";

export function generateOrdersfromPattern(
  pattern: BatchOrderPattern,
): OrderParams[] {
  const orders: OrderParams[] = [];

  // Random number of orders if not specified, max of 8
  const numOrders = pattern.numberOfOrders || Math.ceil(Math.random() * 8);

  // Calculate price points
  const prices: number[] = [];
  if (pattern.priceRange) {
    const { min, max } = pattern.priceRange;
    if (min && max) {
      // Generate evenly spaced prices
      for (let i = 0; i < numOrders; i++) {
        if (pattern.spacing?.type === "percentage") {
          const factor = 1 + pattern.spacing.value / 100;
          prices.push(min * Math.pow(factor, i));
        } else {
          const step = (max - min) / (numOrders - 1);
          prices.push(min + step * i);
        }
      }
    } else if (min) {
      // Generate prices starting from min with specified spacing
      for (let i = 0; i < numOrders; i++) {
        if (pattern.spacing?.type === "percentage") {
          const factor = 1 + pattern.spacing.value / 100;
          prices.push(min * Math.pow(factor, i));
        } else {
          prices.push(min + (pattern.spacing?.value || 0.01) * i);
        }
      }
    }
  }

  // Calculate quantities
  let quantities: number[] = [];
  if (pattern.totalQuantity) {
    const individualQty = pattern.totalQuantity / numOrders;
    quantities = Array(numOrders).fill(individualQty);
  } else if (pattern.individualQuantity) {
    quantities = Array(numOrders).fill(pattern.individualQuantity);
  }

  // Generate orders
  for (let i = 0; i < numOrders; i++) {
    orders.push({
      side: pattern.side,
      price: prices[i],
      quantity: quantities[i],
    });
  }

  return orders;
}


export function validateNoCrossedOrders(orders: OrderParams[]): void {
  // Find lowest sell and highest buy prices
  let lowestSell = Number.MAX_SAFE_INTEGER;
  let highestBuy = 0;

  orders.forEach((order) => {
    if (order.side === "Sell" && order.price < lowestSell) {
      lowestSell = order.price;
    }
    if (order.side === "Buy" && order.price > highestBuy) {
      highestBuy = order.price;
    }
  });

  // Check if orders cross
  if (lowestSell <= highestBuy) {
    throw new Error(
      `Invalid order prices: Sell order at ${lowestSell} is lower than or equal to Buy order at ${highestBuy}. Orders cannot cross.`,
    );
  }
}

