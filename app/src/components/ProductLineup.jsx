import { useEffect, useRef, useState } from 'react';
import ProductCard from './ProductCard';
import { enterStyle, REVEAL, REVEAL_STEP } from '../transition/ProductTransition';

/**
 * The row of product cards a brand grid is built around.
 *
 * It is one row with two layouts, and the switch between them is entirely in
 * `.product-lineup` in src/index.css: an auto-fitting grid at tablet width and
 * up, a horizontal snap carousel on a phone. Nothing here knows which is on
 * screen - the only thing this component adds to the CSS is the position
 * indicator, which needs to know where the row has been scrolled to and so
 * cannot be written as a rule.
 *
 * `hovered` is held here rather than in each grid because dimming the other
 * cards is inherently cross-sibling: a card cannot know to dim from its own
 * state. See the note in ProductCard.jsx.
 */
export default function ProductLineup({
  products,
  basePath,
  theme,
  accent,
  /** Colour of an inactive position mark. The active one takes `accent`. */
  dotIdle,
  /** Route-entrance gate, from useRouteEntranceRevealed() in the page. */
  revealed,
  label = 'Products',
}) {
  const [hovered, setHovered] = useState(null);
  const scrollerRef = useRef(null);
  const [active, setActive] = useState(0);

  // Which card is the subject, by how much of it is on screen. An observer
  // rather than a scroll listener: the marks only change a handful of times
  // per swipe, and reading positions on every scroll event would put a layout
  // measurement in the middle of the one gesture that has to stay smooth.
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || typeof IntersectionObserver === 'undefined') return;
    const items = Array.from(scroller.querySelectorAll('.product-lineup-item'));
    if (!items.length) return;

    const ratios = new Map();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) ratios.set(entry.target, entry.intersectionRatio);
        // Ties go to the earlier card, which is what keeps the grid layout -
        // where every card is fully visible - reading as "the first one".
        let best = 0;
        let bestRatio = -1;
        items.forEach((el, i) => {
          const ratio = ratios.get(el) ?? 0;
          if (ratio > bestRatio + 0.001) {
            bestRatio = ratio;
            best = i;
          }
        });
        setActive(best);
      },
      { root: scroller, threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    items.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [products]);

  return (
    <>
      <div
        ref={scrollerRef}
        className="product-lineup"
        role="group"
        aria-label={label}
      >
        {products.map((product, i) => (
          <div
            key={product.slug}
            className="product-lineup-item"
            style={enterStyle(revealed, REVEAL.controls + i * REVEAL_STEP)}
          >
            <ProductCard
              product={product}
              basePath={basePath}
              theme={theme}
              accent={accent}
              hovered={hovered}
              onHover={setHovered}
            />
          </div>
        ))}
      </div>
      {/* Hidden from assistive tech: it states the scroll position of a list
          that is already fully in the accessibility tree above, in reading
          order, whatever the row is scrolled to. */}
      <div
        className="product-lineup-dots"
        aria-hidden="true"
        style={{ '--lineup-dot-active': accent, '--lineup-dot-idle': dotIdle }}
      >
        {products.map((product, i) => (
          <span key={product.slug} className="product-lineup-dot" data-active={i === active} />
        ))}
      </div>
    </>
  );
}
