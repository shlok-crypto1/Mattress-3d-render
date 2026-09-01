// Per-brand chrome for the product viewers.
//
// Lifted out of MattressViewer so the Sofa cum Bed's viewer can dress itself
// identically without importing that module - and so without pulling the
// mattress viewer, the layer stack and the whole of three.js into that route's
// chunk.
// Values are unchanged from where they lived before.
export const BRAND_THEMES = {
  vedasleep: {
    // The light variant: the mark sets "VEDA" in near-black, which is invisible
    // on this stage. Same file, same alpha, only the black ink moved to Paper -
    // exactly what foamico-logo-light.png does. The brand selector keeps the
    // original, because its VedaSleep panel is still Paper.
    logo: '/brand/vedasleep-logo-light.png',
    logoAlt: 'Veda Sleep',
    logoHeight: 32,
    // Veda Green-Black. Paper (#F7F5F0) still grounds the brand selector and
    // the body; the two pages that show product - this viewer and the card grid
    // - sit on #1F2A22 at the product owner's instruction (2026-09-01).
    //
    // This replaces the #D3D3D3 stage grey that stood here from 2026-08-27, and
    // the reason it had to go dark rather than merely darker is worth keeping,
    // because the intuitive answer is wrong. The three VedaSleep tickings are
    // not all pale: Duro and Maxa photograph at #E2DDDA and #ECE5E4, but Magic
    // is itself a mid-grey at #9D9BA1. A stage between them cannot separate
    // them both, and #D3D3D3 sat exactly there - Duro read at 1.11 against it
    // and Maxa at 1.21, which is no edge at all.
    //
    // Nudging the stage down makes Magic worse, not better, because the stage
    // passes through Magic's own tone on the way: at #9A9A9A Magic measures
    // 1.02 and disappears completely. The only stage that separates all three
    // is one below all of them. Here the worst face on any product measures
    // 2.14 and Magic's top 5.40, and Veda Gold clears AA on the stage at 4.51 -
    // which no lighter dark managed, so the accent stays usable for small text.
    surface:
      'radial-gradient(ellipse 70% 60% at 50% 58%, rgba(199,125,17,0.10) 0%, rgba(199,125,17,0) 62%), #1F2A22',
    text: '#F7F5F0',
    muted: '#93A197',
    faint: '#6B7A70',
    btnBg: '#2A382E',
    btnColor: '#B7C4BB',
    btnActiveBg: '#c77d11',
    btnActiveColor: '#1F2A22',
    // Layer explode chrome. Veda Gold, unchanged - the brand accent does not
    // move with the stage. Its two washes step up to the strengths FOAMICO
    // uses, because a 10% wash that read on near-white does not read on this.
    accent: '#c77d11',
    accentSoft: 'rgba(199,125,17,0.14)',
    accentBorder: 'rgba(199,125,17,0.38)',
    labelBg: 'rgba(31,42,34,0.88)',
    labelColor: '#F7F5F0',
    // Both of these swap sides with the stage, and they are not interchangeable
    // - stageGround is always on, stageTint only while the stack is open.
    //
    // The old dark pool existed to give a white cover a silhouette on a
    // near-white stage. That problem is gone: every VedaSleep ticking is now
    // lighter than its ground. Shading the centre would only close the gap
    // again, so the tint goes.
    stageTint: null,
    // What remains is the mirror of FOAMICO's problem. Magic's border
    // photographs at #8B878E and its bottom darker still, so on a dark stage
    // the one product that is not pale needs the ground lifted under it. Paper
    // at 6% raises the centre and falls to Green-Black at the edges - a tint of
    // one existing token over another, the same construction FOAMICO uses, and
    // far below the level a pale ticking would notice.
    stageGround:
      'radial-gradient(ellipse 68% 60% at 50% 54%, rgba(247,245,240,0.06) 0%, rgba(247,245,240,0) 72%)',
    // The variant menu. Same fill as the grid card and lifted for the same
    // reason - at #26332A it measured 1.13 against the stage and merged into
    // it. This is a popover standing in front of the product, so it has to
    // read as a surface in front of something, not a hole in it.
    cardBg: '#3A4F3F',
    cardBorder: '#4C6552',
    cardShadow: '0 10px 34px rgba(0,0,0,0.45)',
  },
  foamico: {
    logo: '/brand/foamico-logo-light.png',
    logoAlt: 'Foamico',
    logoHeight: 54,
    surface:
      'radial-gradient(ellipse 70% 60% at 50% 58%, rgba(149,193,43,0.10) 0%, rgba(149,193,43,0) 62%), #1A1A1A',
    text: '#FEFEFE',
    muted: '#8f8f8f',
    faint: '#6e6e6e',
    btnBg: '#242424',
    btnColor: '#b5b5b5',
    btnActiveBg: '#95C12B',
    btnActiveColor: '#1A1A1A',
    // Layer explode chrome. Kiwi Green on Key Black - the card and labels have
    // to invert here or they punch a white hole through the dark stage.
    accent: '#95C12B',
    accentSoft: 'rgba(149,193,43,0.14)',
    accentBorder: 'rgba(149,193,43,0.38)',
    labelBg: 'rgba(26,26,26,0.88)',
    labelColor: '#FEFEFE',
    // Key Black already separates a pale layer cleanly - nothing to add.
    stageTint: null,
    // ...but it does not separate a dark one, and that is a different problem.
    // Riva's border is a charcoal non-woven that photographs at #191919-#202020
    // - Key Black, to within a couple of levels of the stage it is standing on.
    // Lit correctly and rendered faithfully it still vanished: nine inches of
    // mattress read as a one-inch white pancake, because the only part of it
    // with any tone against the ground was the quilt panel. No amount of light
    // fixes that; a matte black cloth at 0.95 roughness has no highlight to
    // give and its diffuse term cannot exceed its own albedo.
    //
    // So the ground moves instead of the product, which is what a studio does
    // when it photographs something black: light the background separately.
    // A soft pool of Egg White at 6% lifts the centre of the stage to about
    // #262626 and falls to Key Black at the edges, so a Key Black border has a
    // silhouette. It is a tint of an existing token over another, not a new
    // colour - the same construction VedaSleep's stageTint uses in the other
    // direction, and far below the level where a pale product notices it.
    stageGround:
      'radial-gradient(ellipse 64% 56% at 50% 56%, rgba(254,254,254,0.06) 0%, rgba(254,254,254,0) 72%)',
    cardBg: '#212121',
    cardBorder: '#343434',
    cardShadow: '0 10px 34px rgba(0,0,0,0.45)',
  },
};
