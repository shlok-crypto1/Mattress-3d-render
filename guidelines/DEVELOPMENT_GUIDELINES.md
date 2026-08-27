# Development Guidelines

## 1. General
- Make the smallest change that satisfies the requested outcome.
- Preserve existing architecture unless there is a demonstrated technical reason to change it.
- Reuse existing components, utilities, styles, and asset-loading mechanisms.
- Avoid duplicate implementations of the same behaviour.

## 2. Dependencies
- Do not add a dependency for functionality that can reasonably be implemented with the existing stack.
- Before adding a dependency, check whether the project already contains an equivalent capability.
- Keep dependency additions documented.

## 3. Components
- Keep components focused on one responsibility.
- Separate presentation from product data where practical.
- Avoid hard-coding repeated product values in multiple components.

## 4. 3D code
- Keep model loading, camera behaviour, materials, lighting, and interaction state logically separated.
- Avoid per-frame work that can be calculated once.
- Dispose of WebGL resources when components/models are removed where applicable.

## 5. Styling
- Reuse existing design tokens and patterns.
- Avoid arbitrary one-off values when an established token exists.
- Do not use inline styling as a substitute for understanding the existing design system.

## 6. Deployment
- Preserve relative asset paths and GitHub Pages compatibility.
- Test the production build, not only the development server.
- Do not assume the site is hosted at `/`.

## 7. Documentation
Update the relevant Markdown documentation whenever implementation changes alter documented behaviour.

## 8. Completion standard
A task is not complete when the code merely compiles. It is complete when the requested behaviour works without breaking established UI, 3D presentation, responsive layouts, or asset loading.

## 9. Multi-agent coordination

This repository may be worked on by more than one AI coding agent in the same time period (for example, Claude Code and Codex operating in parallel sessions). Follow these rules whenever that is the case, and assume it may be the case unless told otherwise:

- **Check state before starting.** Run `git status` and `git log -8 --oneline` before making any change. If you see uncommitted changes you did not make, or very recent commits that aren't part of your assigned task, stop and surface this to the user rather than overwriting or rebasing over it.
- **Work on a dedicated branch**, not directly on `main`, unless the user explicitly says otherwise. Name it for the task (e.g. `fix/reverse-transitions`, `feature/euro-top-geometry`).
- **Scope changes strictly to the assigned task.** Do not refactor, rename, or "clean up" files outside what the task requires — an unrelated agent may be actively working in those files.
- **Commit in small, clearly labeled commits** so changes are reviewable and mergeable independently of whatever the other agent is doing.
- **Never force-push or rewrite shared branch history.**
- **Report the branch name and exact files changed** at the end of the task so the user can review before merging, and can tell at a glance whether your change and another agent's change touched overlapping files.
- If a task would require modifying a file that documentation or recent commit history suggests is mid-change by another agent, prefer to complete the parts of the task that don't require touching that file and flag the conflict, rather than proceeding and risking a silent overwrite.

## 10. Data authority

Product facts (names, layer construction, materials, dimensions, coil presence, thicknesses) are governed by `docs/PRODUCT_CATALOG.md`, not by reference images, prior deployments, or visual inspection of the live site alone. If a reference image or the deployed site appears to contradict `PRODUCT_CATALOG.md`, treat the document as authoritative and flag the discrepancy to the user rather than silently following the image. The underlying "never invent a spec" rule itself is owned by `guidelines/DO_NOT_CHANGE.md` — this section only states which document to trust when sources disagree; it does not restate the invent rule.
