/** Price the customer actually pays: discount price if valid, otherwise normal price. */
export const effectivePrice = (product) => {
  const price = Number(product.Price);
  const discount = product.DiscountPrice === null || product.DiscountPrice === undefined ? null : Number(product.DiscountPrice);
  return discount && discount > 0 && discount < price ? discount : price;
};
