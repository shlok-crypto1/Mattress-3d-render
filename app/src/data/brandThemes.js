// Per-brand chrome for the product viewers.
//
// Lifted out of MattressViewer so the Sofa cum Bed's viewer can dress itself
// identically without importing that module - and so without pulling the
// mattress viewer, the layer stack and the whole of three.js into that route's
// chunk.
// Values are unchanged from where they lived before.
export const BRAND_THEMES = {
  vedasleep: {
    logo: '/brand/vedasleep-logo.png',
    logoAlt: 'Veda Sleep',
    logoHeight: 32,
    // Stage grey. Paper (#F7F5F0) still grounds the brand selector and the
    // body; the two pages that show product - this viewer and the card grid -
    // sit on #D3D3D3 at the product owner's instruction (2026-08-27), because a
    // near-white ticking photographed on a white sweep has no ground to read
    // against on cream. The gold radial in front of it is unchanged.
    surface:
      'radial-gradient(ellipse 70% 60% at 50% 58%, rgba(199,125,17,0.08) 0%, rgba(199,125,17,0) 62%), #D3D3D3',
    text: '#2b2b2b',
    muted: '#8a8a8e',
    faint: '#b0b0b4',
    btnBg: '#f4f4f5',
    btnColor: '#6e6e73',
    btnActiveBg: '#1d1d1f',
    btnActiveColor: '#fff',
    // Layer explode chrome. Veda Gold.
    accent: '#c77d11',
    accentSoft: 'rgba(199,125,17,0.10)',
    accentBorder: 'rgba(199,125,17,0.35)',
    labelBg: 'rgba(254,254,254,0.92)',
    labelColor: '#2b2b2b',
    // Soft pool behind the exploded stack. On this near-white stage a white
    // cover has no silhouette to read against; a touch of shade under the
    // model gives it an edge without darkening the page.
    stageTint:
      'radial-gradient(ellipse 68% 60% at 50% 54%, rgba(31,33,28,0.13) 0%, rgba(31,33,28,0) 72%)',
    // Paper-side products are all pale on a light stage and separate on their
    // own; nothing to lift.
    stageGround: null,
    cardBg: '#FEFEFE',
    cardBorder: '#e4e0d4',
    cardShadow: '0 10px 34px rgba(0,0,0,0.10)',
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
