// How a grade is built, as distinct from which bands it is built from.
//
// `variantLayers.js` answers what is inside a mattress; this answers what shape
// the outside of it is. They are separate questions - two grades can share a
// stack and be finished differently, and two products can be finished the same
// way out of entirely different foam - so they are separate files rather than
// one that happens to know both.
//
// `construction` may be declared on a product, in which case every grade of it
// is built that way, or on a single grade, which overrides the product for that
// grade alone. Both shapes exist because the fact has both shapes: a product
// can be a tight top by design, and a product can have one thin grade that
// could not honestly be built any other way. A 5" slab has no room for a
// cushion at 30% of its height.
//
// Anything that declares nothing gets the Euro-top every product in the
// experience had before this file existed, so a product's silhouette only ever
// changes by being named.

/** A base box with a separate cushion sewn on, divided by piping. */
export const EURO_TOP = 'euro-top';
/** One border from floor to binding, with the quilt sewn straight onto it. */
export const TIGHT_TOP = 'tight-top';

/**
 * @param {object} product a product from src/data/*Products.js
 * @param {object|null} variant the selected entry from `product.variants`
 * @returns {string} EURO_TOP or TIGHT_TOP
 */
export function constructionFor(product, variant) {
  return variant?.construction ?? product?.construction ?? EURO_TOP;
}
