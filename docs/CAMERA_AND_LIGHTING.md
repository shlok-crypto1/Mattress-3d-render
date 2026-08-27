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

## When light is not the answer
A product the same tone as the stage it stands on cannot be rescued by lighting
it harder. Riva's border is a charcoal non-woven that photographs at
`#191919`–`#202020` — Key Black, to within a couple of levels of the FOAMICO
stage — and at 0.95 roughness it has no highlight to give, so its diffuse
response cannot exceed its own albedo however much light reaches it. Lit
correctly and rendered faithfully, nine inches of mattress read as a one-inch
white pancake, because the only part of it with any tone against the ground was
the quilt panel. Raising the rig to fix it would have blown out that panel and
every pale product beside it.

The ground moves instead, which is what a studio does when it photographs
something black: light the background separately. The FOAMICO viewer carries a
soft pool of Egg White at 6% behind the model (`stageGround` in
`src/data/brandThemes.js`), lifting the centre of the stage to about `#262626`
and falling to Key Black at the edges, so a Key Black border has a silhouette.
It is always on and never animates — it is the stage, not a state. Its sibling
`stageTint` still fades in with the explode and does the opposite job on the
VedaSleep side.

Check this whenever a product's border photography changes, and treat "the
product is invisible" as a staging question before it is a lighting one.

## Changes
Camera or lighting changes should be tested against every major product state because small changes can materially alter perceived proportions and materials.
