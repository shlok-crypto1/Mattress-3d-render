// Which bands a grade is actually built from.
//
// Most products are one stack cut to several thicknesses: every grade shows
// every band, and the only thing the variant changes is how thick the mattress
// is. Resto is not - its lower grades are the full build with comfort foam
// removed - so a variant may declare `omitLayers`, a list of the layer ids that
// grade leaves out (see src/data/foamicoProducts.js).
//
// Everything here is data-driven and type-driven; no product is named. A
// variant without `omitLayers` gets its product's stack back by identity, so
// every other product renders exactly as it did before this file existed.

/**
 * The cover and the fabric-wrapped base are upholstery, not foam. They are the
 * same components at every grade of a product, so they do not get thinner just
 * because a thinner grade was selected - which is the whole reason the ratios
 * have to be re-solved rather than simply renormalised.
 */
const isUpholstery = (l) => l.type === 'fabric-cover' || l.type === 'fabric-base';

const sumRatio = (defs) => defs.reduce((a, l) => a + (l.thicknessRatio ?? 1), 0);

/**
 * The layer stack for one grade of a product.
 *
 * @param {object} product a product from src/data/*Products.js
 * @param {object|null} variant the selected entry from `product.variants`
 * @returns {Array|null} layer defs ready for buildLayerStack, or null
 *
 * Returns `product.layers` itself - same array, same identity - whenever the
 * grade omits nothing. Callers memoise on the result, and handing back a fresh
 * copy would rebuild the whole stack on every render for products that have no
 * per-grade construction at all.
 */
export function layersForVariant(product, variant) {
  const all = product?.layers;
  if (!all || !all.length) return all ?? null;

  const omit = variant?.omitLayers;
  if (!omit || !omit.length) return all;

  const kept = all.filter((l) => !omit.includes(l.id));
  if (kept.length === all.length) return all;

  // Without `holdUpholstery` the kept bands simply fill the grade's height in
  // proportion to the ratios they already have - buildLayerStack normalises
  // them, so there is nothing further to do here.
  //
  // Holding the upholstery is opt-in rather than the default because it only
  // reads correctly over a narrow spread of grade heights. It is right for
  // Resto, whose grades run 6" to 7". Applied to a product whose grades run 6"
  // to 9" or 10" it makes the base absurd - Riva's would be 42% of an R1000,
  // Luma's nearly half a Classic - because a base sized for the tallest grade
  // is simply not the base a much thinner one is built on.
  if (!product.holdUpholstery) return kept;

  // Baseline is the product's top grade - the one the full stack is specified
  // at - and it is always variants[0] (see the factory in foamicoProducts.js).
  const H0 = product.variants?.[0]?.height;
  const H = variant?.height;
  const fullRatio = sumRatio(all);
  if (!H0 || !H || !fullRatio) return kept;

  // Hold the upholstery at the real thickness it has on the baseline grade and
  // let the foam absorb the difference. A foam split is a percentage of the
  // foam, not of the mattress (docs/PRODUCT_CATALOG.md), so a thinner Resto has
  // to read as less foam rather than as a puffier cover and a deeper base.
  //
  // Ratios are emitted as fractions of H summing to 1, which is exactly what
  // buildLayerStack's `h = H * ratio / totalRatio` already expects.
  const upholsteryFraction = kept
    .filter(isUpholstery)
    .reduce((a, l) => a + (H0 * (l.thicknessRatio ?? 1)) / fullRatio / H, 0);

  const foam = kept.filter((l) => !isUpholstery(l));
  const foamRatio = sumRatio(foam);
  const foamBudget = 1 - upholsteryFraction;

  // Upholstery taller than the mattress it is wrapped around cannot be drawn.
  // Nothing in the current data comes close, but a future grade thin enough to
  // hit this should degrade to plain proportional bands rather than solve for a
  // negative foam layer.
  if (foamBudget <= 0 || !foamRatio) return kept;

  return kept.map((l) => ({
    ...l,
    thicknessRatio: isUpholstery(l)
      ? (H0 * (l.thicknessRatio ?? 1)) / fullRatio / H
      : (foamBudget * (l.thicknessRatio ?? 1)) / foamRatio,
  }));
}
