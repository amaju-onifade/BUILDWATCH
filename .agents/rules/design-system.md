---
trigger: always_on
---

# Rule: Design System

## Token Pipeline

The source of truth is `tokens/color-tokens.json` and `tokens/design-tokens.tokens.json` (Figma exports). The build script `tokens/convert-tokens.js` generates `tokens/theme-tokens.css` from them. All components consume `theme-tokens.css` at runtime.

Do not edit `theme-tokens.css` directly — it is overwritten by `convert-tokens.js`. After every modification to `tokens/color-tokens.json` or `tokens/design-tokens.tokens.json`, you MUST use the `run_command` tool to execute `node tokens/convert-tokens.js`. Never commit JSON changes without updating the CSS.

**Token files:**
- `tokens/color-tokens.json` — color palettes and light/dark role mappings
- `tokens/design-tokens.tokens.json` — typography definitions from Figma
- `tokens/theme-tokens.css` — generated CSS custom properties (consumed by components)
- `tokens/convert-tokens.js` — build script that produces `theme-tokens.css`

## Mandatory: Use CSS Variables, Never Raw Values

The agent must never write hardcoded color values or typography values anywhere in this codebase.

**Wrong:**
```css
color: #1a1a1a;
font-size: 16px;
font-family: 'Inter', sans-serif;
background: #f5f5f5;
```

**Correct (use actual tokens from `theme-tokens.css`):**
```css
color: var(--color-on-surface);
font-size: var(--typography-body-large-font-size);
font-family: var(--typography-body-large-font-family);
background: var(--color-surface);
```

You MUST use the `view_file` tool to read `tokens/theme-tokens.css` before writing any CSS. Do not guess token names. If you need a color or spacing value that is not in the design system, pause and ask the USER to provide the correct token or approve a new one. Do not hardcode a pixel or hex value as a fallback.

## Typography Usage

Map tokens to UI roles following this convention:

| Token group | Used for |
|---|---|
| `display-*` | Hero text, large marketing banners (rarely used) |
| `headline-*` | Page titles, section titles |
| `title-*` | Card titles, dialog headings, product names |
| `body-*` | Paragraphs, descriptions, running text |
| `label-*` | Button labels, form labels, tags, badges, small metadata |

Within each group, use `large` for the primary instance and `medium`/`small` for hierarchy. Product descriptions in a card use `body-medium`. The card's title uses `title-medium`. The page heading uses `headline-medium`.

Examples:
- Product page title → `var(--typography-headline-medium-font-size)` + `var(--typography-headline-medium-line-height)`
- Product description → `var(--typography-body-medium-font-size)` + `var(--typography-body-medium-line-height)`
- Button text → `var(--typography-label-large-font-size)` + `var(--typography-label-large-font-weight)`
- Price display → `var(--typography-title-large-font-size)` + `var(--typography-title-large-line-height)`
- Form label → `var(--typography-label-medium-font-size)` + `var(--typography-label-medium-line-height)`
- Caption / helper text → `var(--typography-body-small-font-size)` + `var(--typography-body-small-line-height)`

Always pair font-size with the corresponding line-height from the same token group.

## Spacing Scale

Use multiples of 4px for all spacing (margin, padding, gap). Do not use arbitrary values.

Allowed: `4px`, `8px`, `12px`, `16px`, `24px`, `32px`, `48px`, `64px`

## Border Radius

The product has a consistent border radius. Use these values only:

- Small elements (badges, tags): `4px`
- Buttons and inputs: `8px`
- Cards and modals: `12px`

## Styling Method

- All component styles use CSS Modules (`.module.css` files). Name the file after the component: `Button.tsx` → `Button.module.css`.
- No inline `style={{}}` props except for truly dynamic values that cannot be expressed in CSS (e.g., a progress bar width driven by a number).
- No Tailwind. No styled-components. CSS Modules only.

## Z-Index Scale

Use these values only:

| Layer | z-index |
|---|---|
| Dropdowns, tooltips | 10 |
| Sticky headers | 20 |
| Modals and dialogs | 30 |
| Toast notifications | 40 |
| Loading spinners / fullscreen overlays | 50 |

Do not use values outside this scale. If you need a new layer, pause and ask the USER for approval.

## Dark Mode

The default is light mode. Dark mode activates automatically when the user's system preference is `prefers-color-scheme: dark`. The `theme-tokens.css` file includes a `@media (prefers-color-scheme: dark)` block that swaps all color role variables.

Do NOT add:
- A manual dark mode toggle (unless the product explicitly requires it — ask first)
- `class="dark"` or `data-theme` switching logic in components
- Hardcoded dark-mode color overrides in component CSS

The correct approach: use `var(--color-*)` tokens everywhere. They resolve to the correct value in both light and dark mode automatically. Test by toggling your OS appearance setting.

## Mobile-First

BuildWatch users are primarily on mobile. Every component must be built mobile-first:

- Default styles target mobile (small screens).
- Use `@media (min-width: 768px)` to layer in desktop styles.
- Touch targets must be a minimum of 44px tall.
- The project dashboard must be fully functional on a 375px viewport.