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
    surface:
      'radial-gradient(ellipse 70% 60% at 50% 58%, rgba(199,125,17,0.08) 0%, rgba(199,125,17,0) 62%), #F6F8F1',
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
    cardBg: '#FEFEFE',
    cardBorder: '#e4e0d4',
    cardTitle: '#1A1A1A',
    cardBody: '#6e6e73',
    cardMeta: '#2b2b2b',
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
    cardBg: '#212121',
    cardBorder: '#343434',
    cardTitle: '#FEFEFE',
    cardBody: '#a8a8a8',
    cardMeta: '#e4e4e4',
    cardShadow: '0 10px 34px rgba(0,0,0,0.45)',
  },
};
