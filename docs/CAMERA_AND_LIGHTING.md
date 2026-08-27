# Camera and Lighting

## Camera goals
The camera should make the mattress easy to understand while preserving a premium product-rendering appearance.

## Camera standards
- Maintain a consistent default viewing angle.
- Keep the product centered within the intended composition.
- Use controlled zoom limits.
- Avoid clipping through geometry.
- Avoid sudden camera jumps between states.

## Lighting standards
- Lighting should reveal form, thickness, edges, stitching and material differences.
- Keep lighting consistent between comparable product states.
- Avoid highlights that erase surface detail.
- Avoid shadows so dark that they hide construction.
- **Every downward-facing surface must be lit.** The rig's key and grazing fill are
  both overhead, so without a dedicated source a surface facing down receives only
  the hemisphere light's ground term — about 23% of what an up-facing surface gets.
  On the base cloth, which is a genuinely dark charcoal non-woven, that crushed the
  whole underside to near-black and took its weave and its silhouette with it,
  breaking the rule directly above. The rig therefore carries a fourth source: a
  bounce aimed straight up, standing in for the white sweep the reference
  photography is shot on. Because it points up it contributes nothing to a
  top-facing normal and next to nothing to a side wall, so it can be tuned without
  touching the quilt or the border.

### Calibrating the bounce
Its intensity is solved against the reference photography rather than picked by
eye: the base cloth photographs at `#474847`, and the rendered underside is
measured against that tone. Re-check it if the tone mapping, exposure, hemisphere
ground colour, or a product's `bottom.png` changes.

## Changes
Camera or lighting changes should be tested against every major product state because small changes can materially alter perceived proportions and materials.
