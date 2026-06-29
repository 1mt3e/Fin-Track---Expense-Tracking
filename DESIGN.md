---
name: FinTrack Design System
description: The Executive Vault - A high-contrast, professional, and security-first visual system for financial tracking.
colors:
  primary: "#0d9488"
  primary-dark: "#0f766e"
  primary-light: "#ccfbf1"
  navy: "#1e293b"
  navy-dark: "#0f172a"
  neutral-bg: "#f8fafc"
  neutral-surface: "#ffffff"
  neutral-border: "#e2e8f0"
  neutral-border-light: "#f1f5f9"
  text-primary: "#1e293b"
  text-secondary: "#64748b"
  text-muted: "#94a3b8"
  groceries: "#0f766e"
  dining: "#9a3412"
  transport: "#1e40af"
  entertainment: "#15803d"
  utilities: "#5b21b6"
  healthcare: "#991b1b"
  shopping: "#92400e"
  other: "#334155"
typography:
  display:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "2.25rem"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.05em"
  headline:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.4
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral-surface}"
    rounded: "{rounded.md}"
    padding: "10px 20px"
  button-primary-hover:
    backgroundColor: "{colors.primary-dark}"
    textColor: "{colors.neutral-surface}"
    rounded: "{rounded.md}"
    padding: "10px 20px"
  button-secondary:
    backgroundColor: "{colors.neutral-surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "10px 20px"
  input-field:
    backgroundColor: "{colors.neutral-surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "10px 14px"
---

# Design System: FinTrack

## 1. Overview

**Creative North Star: "The Executive Vault"**

"The Executive Vault" visual system balances absolute functional clarity with premium dashboard aesthetics. Inspired by high-fidelity engineering and corporate platforms like Stripe and Linear, it frames user financial data in a structured, secure, and highly clean layout. Spacing is tight, information density is maximized without inducing cognitive fatigue, and navigation is kept close to actions.

This design system rejects the saturated, generic consumer-SaaS template tropes of neon primary colors, huge card grids, and distracting micro-animations. It operates with a professional tone, leveraging high-contrast borders, solid neutrals, and a single, restrained primary color to signal trustworthiness and executive precision.

**Key Characteristics:**
- High-contrast, tactile slate borders (`#e2e8f0` light, `#334155` dark) instead of soft gray fills.
- Restricted primary color utilization (Teal `#0d9488` is used strictly as an interactive signifier).
- Premium typography hierarchy based on the Inter sans-serif typeface, styled with tight letter-spacing for large headlines.
- Minimalist elevation vocabulary where elements are flat by default and rely on tactile focus borders.

---

## 2. Colors

The palette is professional, cool-toned, and dark-mode native, emphasizing a crisp contrast between background slate neutrals and interactive teal highlights.

### Primary
- **Executive Teal** (#0d9488 / oklch(60.14% 0.147 186.23)): Used strictly for primary calls to action, active navigation tabs, and positive status highlights.

### Neutral
- **Background Slate** (#f8fafc / oklch(98.48% 0.004 240)): Main layout background, providing a clean canvas.
- **Surface Canvas** (#ffffff / oklch(100% 0 0)): Primary surface container background (cards, tables, modals).
- **Ink Primary** (#1e293b / oklch(27.81% 0.029 256.8)): Base body text, delivering high readability.
- **Ink Secondary** (#64748b / oklch(54.41% 0.034 256)): Subtitles, metadata, and labels.
- **Tactile Border** (#e2e8f0 / oklch(92.79% 0.006 264)): Base separation boundaries for layouts, inputs, and list rows.

### Named Rules
**The 10% Teal Rule.** The primary accent is used on ≤10% of any given screen. Teal's rarity is what guides the user's eye directly to key callouts and primary actions.
**The Tint Preservation Rule.** Dark mode changes text, surface, and border values relative to Slate, preserving cool/neutral tones rather than shifting to warm charcoal.

---

## 3. Typography

**Display Font:** Inter (with fallback `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`)
**Body Font:** Inter (with fallback `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`)

The typography relies entirely on Inter. It utilizes letter-spacing tweaks to establish distinct voices: tight letter-spacing on display/headlines for a modern geometric look, and regular spacing for body text to maintain optimal readability.

### Hierarchy
- **Display** (800, 2.25rem, 1.2): Title headers for main entry pages (e.g. Monthly Ledger titles).
- **Headline** (700, 1.5rem, 1.3): Major page subheadings and modal headers.
- **Title** (600, 1.125rem, 1.4): Table column titles, action bar headers, and card labels.
- **Body** (400, 1rem, 1.6): Default transaction details, description text. Line length is capped at 75ch.
- **Label** (500, 0.875rem, 1.4): Input labels, tooltips, helper text, and tags.

---

## 4. Elevation

The Executive Vault utilizes a highly restrained depth model. Surfaces are flat by default with 1px solid borders. Depth is only introduced to separate primary overlay blocks (like dropdowns and modals) from background content.

### Shadow Vocabulary
- **Tactile Hover** (`0 4px 6px -1px rgba(0, 0, 0, 0.07)` / Dark: `0 4px 6px -1px rgba(0, 0, 0, 0.4)`): Applied only on hover actions of cards or tables.
- **Modal Overlay** (`0 20px 25px -5px rgba(0, 0, 0, 0.1)` / Dark: `0 20px 25px -5px rgba(0, 0, 0, 0.5)`): Reserved for floating panels, dropdowns, and modals to elevate them above the base canvas.

### Named Rules
**The Flat-By-Default Rule.** Elements do not float or cast shadows at rest. Elevation is a dynamic response to user hover, focus, or modal actions.

---

## 5. Components

Components focus on high-fidelity density and clear interactive responses.

### Buttons
- **Shape:** Curved edges with a 8px radius (`var(--radius-md)`).
- **Primary:** Background Executive Teal (`#0d9488`), text white (`#ffffff`). Padding is `10px 20px`.
- **Hover / Focus:** Hover shifts background color to `#0f766e` with a smooth 150ms transition. Focus exhibits a high-contrast outline.
- **Secondary / Ghost:** White background, Slate text (`#1e293b`), and a 1px border (`#e2e8f0`). Hovers trigger a background tint shift to light teal/gray.

### Cards / Containers
- **Corner Style:** 12px radius (`var(--radius-lg)`).
- **Background:** White (`#ffffff`), shifting to dark slate (`#1e293b`) in dark mode.
- **Border:** 1px solid Slate (`#e2e8f0`).
- **Internal Padding:** `1.25rem` to `1.5rem` (`20px - 24px`).

### Inputs / Fields
- **Style:** Background white (`#ffffff`), 1px solid border (`#e2e8f0`), 8px radius (`var(--radius-md)`).
- **Focus:** Border transitions to Executive Teal (`#0d9488`) with a subtle teal outline glow.
- **Error:** Border transitions to Red (`#ef4444`) with accompanying error text beneath the field.

### Navigation
- **Style:** Top-aligned navbar with a height of 64px, 1px bottom border. Tab links are dark slate, shifting to Executive Teal with a solid bottom indicator when active.

---

## 6. Do's and Don'ts

### Do:
- **Do** use strict `1px solid` borders (`var(--color-border)`) for structural separation instead of relying on color blocking.
- **Do** respect system prefers-reduced-motion, swapping transitions out for instant value switches.
- **Do** maintain a strict 4.5:1 text-to-background contrast ratio, particularly for helper text.

### Don't:
- **Don't** use neon color accents or multi-colored gradients on text headers.
- **Don't** use side-stripe borders as card accents or status highlights.
- **Don't** animate image scale or position on card hover states.
- **Don't** use decorative glassmorphism background blurs as defaults for standard page panels.
