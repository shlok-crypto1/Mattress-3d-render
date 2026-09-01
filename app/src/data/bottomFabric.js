// The cloth on the underside of a mattress, named for the Bottom view.
//
// This is one fact with one exception, so it is stated once here rather than
// copied onto nine product objects - the same reasoning that fixes the base
// band's name inside the layer factory instead of passing it in per product.
// The two brands declare their products in different shapes (FOAMICO through a
// factory, VedaSleep as literals), so a field would have had to be written
// twice over anyway, in two styles, for a value that varies in exactly one
// place.
//
// It is not a layer. The Layers view names the bottom *band* Quilted Foam -
// transition foam bonded to a fabric-wrapped base, merged into one band - and
// this names the cloth wrapping that base's underside. Both are true of the
// same slab, seen from different sides, and neither supersedes the other.

export const ANTI_SKID = 'Anti Skid Fabric';

// Riva alone. The product owner excluded it on 2026-09-01 and gave no
// replacement name, so its Bottom view shows no label at all rather than a
// guess - Riva is the one product whose base is a navy denim-look cloth rather
// than the charcoal weave the rest carry, and it is the only product in either
// brand whose materials are trademarked. If a name for it arrives, add it here
// as a value and nothing else in the app needs to change.
const NO_LABEL = new Set(['riva']);

/** The underside cloth's name for a product, or null if it has none. */
export function bottomFabricFor(slug) {
  return NO_LABEL.has(slug) ? null : ANTI_SKID;
}
