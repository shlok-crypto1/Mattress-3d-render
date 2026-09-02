import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { MOTION, EASE } from '../lib/motion';
import { publicUrl } from '../lib/publicUrl';
import { prefersReducedMotion } from '../transition/ProductTransition';

// The Mattress Guide, docked bottom-right.
//
// The bot is authored as its own standalone document (see
// scripts/build-chatbot.mjs) and is loaded here in an iframe rather than ported
// into React. That is deliberate, not laziness: the bot styles `body`, owns the
// `:root` custom properties it themes from, and writes `data-theme` onto its
// own documentElement. Inlined, all three of those would land on this app's
// document and fight the page it is floating over - and the one thing a help
// widget must never do is disturb the product it is helping with. In a frame it
// also stays independently editable: change the source document, run
// `npm run sync:bot`, done. No React work.

// Where the dock appears, and in whose colours.
//
// Product pages are deliberately absent. They are the 3D viewers, and a bubble
// parked over a mattress someone is rotating is in the way of the one thing
// that page exists to do.
const DOCK_ROUTES = {
  // The brand selector is split down the middle - Key Black on one side, Paper
  // on the other - so no single page colour can be matched here. Kiwi Green is
  // the bot's own accent and it is a filled disc either way: bright on the
  // black panel, and clearly not-cream on the Paper one.
  '/': { accent: '#95C12B', ink: '#1A1A1A', shadow: 'rgba(0,0,0,0.45)' },
  '/foamico': { accent: '#95C12B', ink: '#1A1A1A', shadow: 'rgba(0,0,0,0.5)' },
  // Veda Gold on Veda Green-Black, the pairing the grid's own badges use.
  '/vedasleep': { accent: '#c77d11', ink: '#1F2A22', shadow: 'rgba(0,0,0,0.5)' },
};

// Under the shared-element overlay (2147483000 in ProductTransition), above
// everything else. A card flying to its product page should pass over the dock,
// not vanish behind it.
const Z = 2147482000;

const SIZE = 56;

export default function ChatWidget() {
  const { pathname } = useLocation();
  const theme = DOCK_ROUTES[pathname];
  const [open, setOpen] = useState(false);
  // The bot document is ~190KB. It is fetched on first open and never again -
  // which is why the frame stays mounted below once it exists, even while the
  // dock is hidden. Someone who asks about Resto, opens Resto to look at it,
  // and comes back should find their conversation still there.
  const [loaded, setLoaded] = useState(false);
  const frameRef = useRef(null);
  const reduced = prefersReducedMotion();

  // A route with no dock cannot show the panel, whatever the button last did -
  // otherwise it would still be sitting open, and still taking pointer events,
  // over a product viewer. Derived rather than forced shut on navigation, so
  // that coming back to a grid restores the panel you left open on it.
  const showPanel = open && !!theme;

  // Escape closes - but only while focus is in this document. Once the caret is
  // inside the frame its keystrokes never reach us, which is exactly why the
  // launcher doubles as the close control rather than hiding a close button in
  // a header the bot already draws for itself.
  useEffect(() => {
    if (!showPanel) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showPanel]);

  useEffect(() => {
    if (showPanel) frameRef.current?.focus();
  }, [showPanel]);

  if (!theme && !loaded) return null;

  const motion = reduced
    ? 'none'
    : `opacity ${MOTION.normal}ms ${EASE.enter}, transform ${MOTION.normal}ms ${EASE.enter}`;

  const label = open
    ? 'Close the Mattress Guide'
    : 'Ask the Mattress Guide about prices, sizes and specifications';

  return createPortal(
    <div className="chatdock" style={{ zIndex: Z }}>
      <style>{`
        .chatdock { position: fixed; inset: 0; pointer-events: none; }
        .chatdock__panel {
          position: absolute;
          right: 20px;
          bottom: ${SIZE + 36}px;
          width: min(400px, calc(100vw - 40px));
          height: min(620px, calc(100dvh - ${SIZE + 72}px));
          border-radius: 16px;
          overflow: hidden;
          background: #FBFCF8;
          border: 1px solid rgba(0,0,0,0.12);
          transform-origin: 100% 100%;
        }
        .chatdock__frame { display: block; width: 100%; height: 100%; border: 0; }
        .chatdock__btn {
          position: absolute;
          right: 20px;
          bottom: 20px;
          width: ${SIZE}px;
          height: ${SIZE}px;
          border: 0;
          border-radius: 50%;
          display: grid;
          place-items: center;
          padding: 0;
          cursor: pointer;
          pointer-events: auto;
        }
        .chatdock__btn:focus-visible { outline: 2px solid currentColor; outline-offset: 3px; }

        /* On a phone the panel is the screen, near enough - a 400px column
           inset from both edges would leave slivers of the page showing down
           each side and read as a mistake rather than a choice. */
        @media (max-width: 520px) {
          .chatdock__panel {
            left: 10px;
            right: 10px;
            width: auto;
            bottom: ${SIZE + 28}px;
            height: min(640px, calc(100dvh - ${SIZE + 56}px));
          }
        }
      `}</style>

      {/* Mounted from the first open onwards, hidden rather than removed - see
          the note on `loaded`. Hidden with `visibility`, not `display:none`,
          because a display-none iframe is re-laid-out on every reveal and the
          bot's message stream jumps back to the top when that happens. */}
      {loaded ? (
        <div
          className="chatdock__panel"
          aria-hidden={!showPanel}
          style={{
            opacity: showPanel ? 1 : 0,
            transform: showPanel || reduced ? 'none' : 'translateY(10px) scale(0.98)',
            visibility: showPanel ? 'visible' : 'hidden',
            pointerEvents: showPanel ? 'auto' : 'none',
            boxShadow: `0 18px 48px -12px ${theme?.shadow ?? 'rgba(0,0,0,0.5)'}`,
            transition: motion,
          }}
        >
          <iframe
            ref={frameRef}
            className="chatdock__frame"
            src={publicUrl('/chatbot/index.html')}
            title="Mattress Guide - ask about prices, sizes and specifications"
            // The bot is a self-contained document that talks to nobody. Give it
            // only what it needs to run: its own scripts, its own forms, and
            // same-origin so its theme and language choices can reach
            // localStorage. No allow-top-navigation, so nothing inside the frame
            // can move the page out from under the site.
            sandbox="allow-scripts allow-forms allow-same-origin"
          />
        </div>
      ) : null}

      {theme ? (
        <button
          type="button"
          className="chatdock__btn"
          onClick={() => {
            setLoaded(true);
            setOpen((v) => !v);
          }}
          aria-expanded={open}
          aria-label={label}
          title={open ? 'Close' : 'Ask about prices, sizes and specs'}
          style={{
            background: theme.accent,
            color: theme.ink,
            boxShadow: `0 6px 20px -6px ${theme.shadow}`,
            transition: reduced ? 'none' : `background ${MOTION.fast}ms ${EASE.enter}`,
          }}
        >
          {open ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M21 11.5a8.4 8.4 0 0 1-8.5 8.4 8.9 8.9 0 0 1-3.9-.9L3 21l1.9-5.2a8.2 8.2 0 0 1-1.1-4.3A8.4 8.4 0 0 1 12.3 3 8.4 8.4 0 0 1 21 11.5z"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
      ) : null}
    </div>,
    document.body
  );
}
