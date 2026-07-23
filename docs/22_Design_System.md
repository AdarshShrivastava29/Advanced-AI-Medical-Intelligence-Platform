# 22 — Design System

> **Product:** Advanced AI Medical Intelligence Platform (**AIMIP**)
> **Scope:** Design tokens (color, typography, spacing, radius, elevation), the glassmorphism
> recipe, the component library specification, states/variants, iconography (Lucide), dark-mode
> strategy, and the TailwindCSS config mapping — with token tables and CSS/Tailwind snippets.
>
> **Canonical source:** [_CANON.md](_CANON.md) §10 (palette & design), §1 (stack).
> **Related:** [UI/UX Guidelines](21_UI_UX_Guidelines.md) · [Frontend Architecture](08_Frontend_Architecture.md)

Stack anchors (canon §1): **React 19 + Vite + TypeScript**, **TailwindCSS**, **Framer Motion**,
**Recharts**, **Lucide-react**, forms with **React Hook Form + Zod**. This design system is the
single source for how AIMIP *looks*; [UI/UX Guidelines](21_UI_UX_Guidelines.md) is the single
source for how it *behaves*.

---

## 1. Design tokens

Tokens are defined as **CSS custom properties** on `:root` (light) and `.dark` (dark), then
referenced by Tailwind via the config in §9. This gives a single semantic layer that both plain
CSS and Tailwind utilities consume, and makes dark mode a variable swap.

### 1.1 Color — brand & medical scales

The medical identity is the **primary blue `#0EA5E9`** (Sky 500) and **teal `#14B8A6`**
(Teal 500) from canon §10. Full tonal scales support surfaces, borders, hovers, and AA text.

**Primary (medical blue)**

| Step | Hex | Typical use |
|------|-----|-------------|
| 50 | `#F0F9FF` | Tint backgrounds, hover fills (light) |
| 100 | `#E0F2FE` | Subtle surfaces, chips |
| 200 | `#BAE6FD` | Borders on tinted surfaces |
| 300 | `#7DD3FC` | Disabled accents, dark-mode text accents |
| 400 | `#38BDF8` | Hover of 500 |
| **500** | **`#0EA5E9`** | **Brand primary — buttons, links, focus** |
| 600 | `#0284C7` | Primary hover/pressed (light) |
| 700 | `#0369A1` | Primary text on light tints |
| 800 | `#075985` | High-contrast text |
| 900 | `#0C4A6E` | Headings on light tints |
| 950 | `#082F49` | Deep accents |

**Teal (secondary / accent)**

| Step | Hex | Use |
|------|-----|-----|
| 50 | `#F0FDFA` | Accent tint |
| 100 | `#CCFBF1` | Accent chips, indexed badges |
| 200 | `#99F6E4` | Accent borders |
| 300 | `#5EEAD4` | Dark-mode accent text |
| 400 | `#2DD4BF` | Accent hover |
| **500** | **`#14B8A6`** | **Secondary accent — highlights, secondary buttons** |
| 600 | `#0D9488` | Accent hover/pressed |
| 700 | `#0F766E` | Accent text on light |
| 800 | `#115E59` | — |
| 900 | `#134E4A` | Accent headings |
| 950 | `#042F2E` | Deep accent |

### 1.2 Color — risk semantics

Risk levels are canonical (`low | moderate | high`, canon §6/§10). Each has a **base** (icon/
border), a **surface** (badge fill), and an **on-surface** text value tuned for AA. Color is
**always paired with a label + icon** (see [UI/UX Guidelines](21_UI_UX_Guidelines.md) §6.1).

| Risk | Base (500) | Surface (light) | On-surface text | Surface (dark) | Icon (Lucide) |
|------|-----------|-----------------|-----------------|----------------|---------------|
| **Low** (green) | `#22C55E` | `#DCFCE7` | `#14532D` | `#052E16` | `shield-check` |
| **Moderate** (amber) | `#F59E0B` | `#FEF3C7` | `#78350F` | `#451A03` | `alert-triangle` |
| **High** (red) | `#EF4444` | `#FEE2E2` | `#7F1D1D` | `#450A0A` | `alert-octagon` |

Class badges reuse these families: `NORMAL` → risk-low green; `PNEUMONIA` → contextual amber/
red driven by the report `risk_level`, never green.

### 1.3 Color — semantic UI tokens (light & dark)

These are the tokens components reference. Left = **light** (`:root`), right = **dark** (`.dark`).

| Semantic token | Light | Dark | Role |
|----------------|-------|------|------|
| `--bg` | `#F8FAFC` | `#0B1220` | App background |
| `--bg-subtle` | `#F1F5F9` | `#0F172A` | Section background |
| `--surface` | `#FFFFFF` | `#111C30` | Card/panel base |
| `--surface-2` | `#F8FAFC` | `#152238` | Nested surface |
| `--glass` | `rgba(255,255,255,0.60)` | `rgba(17,28,48,0.55)` | Glassmorphism fill |
| `--glass-border` | `rgba(255,255,255,0.50)` | `rgba(148,163,184,0.18)` | Glass edge |
| `--border` | `#E2E8F0` | `#243449` | Default border/divider |
| `--text` | `#0F172A` | `#E2E8F0` | Primary text |
| `--text-muted` | `#475569` | `#94A3B8` | Secondary text |
| `--text-subtle` | `#64748B` | `#64748B` | Tertiary/help text |
| `--primary` | `#0EA5E9` | `#38BDF8` | Interactive primary |
| `--primary-hover` | `#0284C7` | `#0EA5E9` | Primary hover |
| `--primary-fg` | `#FFFFFF` | `#082F49` | Text on primary |
| `--accent` | `#14B8A6` | `#2DD4BF` | Secondary accent |
| `--focus` | `#0EA5E9` | `#38BDF8` | Focus ring |
| `--success` | `#22C55E` | `#4ADE80` | Success |
| `--warning` | `#F59E0B` | `#FBBF24` | Warning |
| `--danger` | `#EF4444` | `#F87171` | Error/destructive |
| `--info` | `#0EA5E9` | `#38BDF8` | Info / disclaimer accent |
| `--ring-offset` | `#FFFFFF` | `#0B1220` | Focus ring offset |

All text/background pairings above meet **WCAG 2.1 AA** (≥ 4.5:1 body, ≥ 3:1 large/UI) per
[UI/UX Guidelines](21_UI_UX_Guidelines.md) §6.1.

### 1.4 Token definition (CSS)

```css
/* styles/tokens.css */
:root {
  /* brand */
  --primary: #0EA5E9; --primary-hover: #0284C7; --primary-fg: #FFFFFF;
  --accent: #14B8A6;
  /* surfaces */
  --bg: #F8FAFC; --bg-subtle: #F1F5F9;
  --surface: #FFFFFF; --surface-2: #F8FAFC;
  --glass: rgba(255,255,255,0.60); --glass-border: rgba(255,255,255,0.50);
  --border: #E2E8F0;
  /* text */
  --text: #0F172A; --text-muted: #475569; --text-subtle: #64748B;
  /* status */
  --success: #22C55E; --warning: #F59E0B; --danger: #EF4444; --info: #0EA5E9;
  /* risk */
  --risk-low: #22C55E; --risk-moderate: #F59E0B; --risk-high: #EF4444;
  /* focus */
  --focus: #0EA5E9; --ring-offset: #FFFFFF;
  /* radius / elevation */
  --radius-md: 12px; --shadow-md: 0 4px 12px rgba(15,23,42,0.08);
}

.dark {
  --primary: #38BDF8; --primary-hover: #0EA5E9; --primary-fg: #082F49;
  --accent: #2DD4BF;
  --bg: #0B1220; --bg-subtle: #0F172A;
  --surface: #111C30; --surface-2: #152238;
  --glass: rgba(17,28,48,0.55); --glass-border: rgba(148,163,184,0.18);
  --border: #243449;
  --text: #E2E8F0; --text-muted: #94A3B8; --text-subtle: #64748B;
  --success: #4ADE80; --warning: #FBBF24; --danger: #F87171; --info: #38BDF8;
  --risk-low: #4ADE80; --risk-moderate: #FBBF24; --risk-high: #F87171;
  --focus: #38BDF8; --ring-offset: #0B1220;
  --shadow-md: 0 4px 16px rgba(0,0,0,0.45);
}
```

### 1.5 Typography scale — Inter

Font family **Inter** (canon §10) with a system fallback; monospace for IDs/tokens/code.

```css
--font-sans: "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
--font-mono: "JetBrains Mono", ui-monospace, "SFMono-Regular", Menlo, monospace;
```

Type scale (1.25 major-third-ish, tuned): sizes in rem (root 16px), with line-height and weight.

| Token | Size | Line height | Weight | Use |
|-------|------|-------------|--------|-----|
| `display` | 3.0rem / 48px | 1.1 | 700 | Landing hero |
| `h1` | 2.25rem / 36px | 1.15 | 700 | Page title |
| `h2` | 1.75rem / 28px | 1.2 | 600 | Section |
| `h3` | 1.375rem / 22px | 1.3 | 600 | Card title |
| `h4` | 1.125rem / 18px | 1.35 | 600 | Sub-section |
| `body-lg` | 1.125rem / 18px | 1.6 | 400 | Lead paragraph |
| `body` | 1.0rem / 16px | 1.6 | 400 | Default text |
| `body-sm` | 0.875rem / 14px | 1.55 | 400 | Secondary / table |
| `caption` | 0.75rem / 12px | 1.4 | 500 | Labels, badges, help |
| `mono` | 0.875rem / 14px | 1.5 | 400 | IDs, model_version, code |

Guidance: `-0.011em` tracking on `h1`–`display`; Inter tabular-nums (`font-variant-numeric:
tabular-nums`) for KPI numbers and confidence/probability values so digits don't jitter on
count-up.

### 1.6 Spacing scale — 8px base

Canonical **8px scale** (canon §10) with 4px half-steps for fine control.

| Token | px | rem | Typical use |
|-------|----|-----|-------------|
| `0` | 0 | 0 | reset |
| `0.5` | 4 | 0.25 | icon gap, badge padding |
| `1` | 8 | 0.5 | tight gap |
| `2` | 16 | 1 | control padding, card inner gap |
| `3` | 24 | 1.5 | card padding, section gap |
| `4` | 32 | 2 | block gap |
| `5` | 40 | 2.5 | large gap |
| `6` | 48 | 3 | section spacing |
| `8` | 64 | 4 | page section |
| `10` | 80 | 5 | hero spacing |
| `12` | 96 | 6 | major vertical rhythm |

All layout paddings/margins/gaps snap to this scale; avoid arbitrary values.

### 1.7 Radius, elevation & shadow

| Radius | px | Use |
|--------|----|-----|
| `sm` | 6 | badges, chips, inputs (compact) |
| `md` | 12 | buttons, inputs, cards (default) |
| `lg` | 16 | panels, modals |
| `xl` | 24 | glass hero cards |
| `full` | 9999 | avatars, pills, toggles |

Elevation is layered and theme-aware (softer/wider in light, darker in dark):

| Level | Light shadow | Dark shadow | Use |
|-------|--------------|-------------|-----|
| `e0` | none | none | flat surfaces |
| `e1` | `0 1px 2px rgba(15,23,42,0.06)` | `0 1px 2px rgba(0,0,0,0.4)` | subtle cards |
| `e2` | `0 4px 12px rgba(15,23,42,0.08)` | `0 4px 16px rgba(0,0,0,0.45)` | cards, dropdowns |
| `e3` | `0 10px 24px rgba(15,23,42,0.12)` | `0 12px 28px rgba(0,0,0,0.55)` | modals, popovers |
| `glass` | `0 8px 32px rgba(2,132,199,0.10)` | `0 8px 32px rgba(0,0,0,0.5)` | glass cards |

---

## 2. Glassmorphism recipe

Glass cards are AIMIP's signature surface (canon §10). The recipe balances translucency with
**AA text contrast** by keeping fill opacity high enough and text on solid tokens.

```css
/* components/glass.css */
.glass {
  background: var(--glass);                 /* translucent surface */
  -webkit-backdrop-filter: blur(16px) saturate(140%);
  backdrop-filter: blur(16px) saturate(140%);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg, 16px);
  box-shadow: 0 8px 32px rgba(2,132,199,0.10);
}
.dark .glass { box-shadow: 0 8px 32px rgba(0,0,0,0.5); }

/* Fallback: browsers without backdrop-filter get an opaque surface */
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .glass { background: var(--surface); }
}

/* Reduce blur cost / motion sensitivity */
@media (prefers-reduced-transparency: reduce) {
  .glass { background: var(--surface); backdrop-filter: none; -webkit-backdrop-filter: none; }
}
```

Tailwind equivalent (using mapped tokens from §9):

```html
<div class="bg-glass border border-glass-border rounded-lg shadow-glass
            backdrop-blur-xl backdrop-saturate-150">…</div>
```

Rules:
- **Never** place body text directly on a low-opacity glass fill over a busy background; keep
  the glass fill ≥ 0.55 opacity and use `--text` (solid).
- Provide the `@supports` fallback so unsupported browsers still get readable opaque cards.
- Respect `prefers-reduced-transparency` (§accessibility) by collapsing to a solid surface.

---

## 3. Component library specification

Every component ships with the **states/variants** in §4, the focus/ARIA behavior from
[UI/UX Guidelines](21_UI_UX_Guidelines.md) §6, and lives under `components/ui`, `components/
layout`, or `components/charts` (canon §4).

### 3.1 Button

Variants: `primary`, `secondary` (teal), `outline`, `ghost`, `destructive`, `link`.
Sizes: `sm` (32px), `md` (40px), `lg` (48px). Icon-only variant is square with `aria-label`.

| Variant | Fill | Text | Hover | Focus |
|---------|------|------|-------|-------|
| primary | `--primary` | `--primary-fg` | `--primary-hover` | 2px `--focus` ring + offset |
| secondary | `--accent` | white/`#042F2E` | `#0D9488` | same |
| outline | transparent, `--border` | `--text` | `--bg-subtle` | same |
| ghost | transparent | `--text-muted` | `--bg-subtle` | same |
| destructive | `--danger` | white | darker danger | same |
| link | none | `--primary` | underline | same |

```tsx
// components/ui/Button.tsx (variant excerpt using cva-style classes)
const base =
  "inline-flex items-center justify-center gap-2 rounded-md font-medium " +
  "transition-colors focus-visible:outline-none focus-visible:ring-2 " +
  "focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-ring-offset " +
  "disabled:opacity-50 disabled:pointer-events-none";
const variants = {
  primary:   "bg-primary text-primary-fg hover:bg-primary-hover",
  secondary: "bg-accent text-white hover:bg-teal-600",
  outline:   "border border-border text-text hover:bg-bg-subtle",
  ghost:     "text-text-muted hover:bg-bg-subtle",
  destructive:"bg-danger text-white hover:brightness-95",
  link:      "text-primary underline-offset-4 hover:underline",
};
```

States: default, hover, focus-visible, active (`scale-98`), disabled, **loading** (spinner
replaces leading icon, label retained, `aria-busy`).

### 3.2 Input & form controls

Covers text input, textarea, select, checkbox, radio, switch, password field (show/hide),
file input (see dropzone §3.10). Built to pair with **React Hook Form + Zod** — the wrapper
renders `label`, control, help text, and error text wired via `aria-describedby`/`aria-invalid`.

| State | Border | Ring | Note |
|-------|--------|------|------|
| default | `--border` | — | placeholder `--text-subtle` |
| focus | `--focus` | 2px `--focus` | |
| error | `--danger` | 2px danger | `aria-invalid`, error text below |
| disabled | `--border` @ 50% | — | `--bg-subtle` fill |
| success | `--success` | — | optional (e.g. password match) |

```tsx
<div class="space-y-1">
  <label for="email" class="text-caption text-text-muted">Email</label>
  <input id="email" type="email" aria-invalid={!!error} aria-describedby="email-err"
    class="w-full h-10 rounded-md border border-border bg-surface px-3 text-body
           text-text placeholder:text-text-subtle
           focus:border-focus focus:outline-none focus:ring-2 focus:ring-focus
           aria-[invalid=true]:border-danger aria-[invalid=true]:ring-danger" />
  {error && <p id="email-err" class="text-caption text-danger">{error}</p>}
</div>
```

### 3.3 Card

Base container: `--surface`, radius `md`/`lg`, elevation `e1`/`e2`, padding `space-3`. Sub-
parts: `CardHeader`, `CardTitle` (`h3`), `CardDescription` (`text-muted`), `CardContent`,
`CardFooter`. **GlassCard** variant applies the §2 recipe. **StatCard** variant adds a Lucide
icon chip, KPI value (tabular-nums), label, and optional delta indicator.

### 3.4 Badge / chip

Sizes `sm`/`md`; shapes pill (`rounded-full`) or tag (`rounded-sm`).

| Semantic | Surface | Text | Icon |
|----------|---------|------|------|
| risk-low / NORMAL | risk-low surface | risk-low on-surface | `shield-check` |
| risk-moderate | moderate surface | moderate on-surface | `alert-triangle` |
| risk-high / PNEUMONIA(high) | high surface | high on-surface | `alert-octagon` |
| role user/doctor/admin | primary-100 / teal-100 / slate | matching 800 | `user` / `stethoscope` / `shield` |
| status uploaded/processing/indexed/failed | slate / amber / teal / red surface | matching text | `clock`/`loader`/`check`/`x` |

Badges always include a **text label** (never color-only).

### 3.5 Tabs

`role="tablist"` with arrow-key navigation and `aria-selected` (used in Settings and the
Grad-CAM viewer). Underline-style indicator animated with Framer `layoutId` (respects reduced-
motion). Active tab uses `--primary` text + indicator; inactive `--text-muted`.

### 3.6 Modal / Dialog

Centered `role="dialog"` `aria-modal="true"` on a scrim (`rgba(2,6,23,0.5)` + backdrop-blur).
**Focus-trapped**, Escape closes, focus returns to trigger. Panel: `--surface`, radius `lg`,
elevation `e3`, max-width `28rem` (confirm) / `40rem` (content). Enter/exit via Framer
(`motion.slow`, scale 0.96→1 + fade). Confirmation modals (e.g. delete document) use a
`destructive` primary button.

### 3.7 Toast

Top-right stack, `role="status"` (`aria-live="polite"`; errors `assertive`). Variants
success/info/warning/danger with a leading Lucide icon and optional action. Auto-dismiss 4s
(errors persist). Slide + spring enter (§motion). Max 3 visible; older ones collapse.

### 3.8 Chart wrappers (Recharts)

`ChartCard` (layout wrapper: title, subtitle, legend slot, actions, body) + typed wrappers
`LineTrend`, `DonutDistribution`, `ConfidenceHistogram` used by the Analytics page.

- **Palette:** categorical series draw from `[--primary, --accent, #8B5CF6, #F59E0B, #64748B]`;
  distribution donut uses risk semantics (NORMAL=green, PNEUMONIA=red/amber).
- **Theme-aware:** axis/grid `--border`, tick text `--text-muted`, tooltip on `--surface` with
  `e2`. Read CSS vars via `getComputedStyle` or a `useThemeColors` hook so charts recolor on
  theme toggle.
- **Accessibility:** each chart has an accessible name/desc and a toggleable data-table
  fallback ([UI/UX Guidelines](21_UI_UX_Guidelines.md) §6.3).
- **Skeleton:** chart-shaped placeholder (axis frame + bars/line stub), not a spinner.

```tsx
// components/charts/ChartCard.tsx (shape)
export function ChartCard({ title, subtitle, children, actions }: ChartCardProps) {
  return (
    <section class="glass rounded-lg p-6" aria-label={title}>
      <header class="flex items-center justify-between mb-4">
        <div><h3 class="text-h4 text-text">{title}</h3>
          {subtitle && <p class="text-caption text-text-muted">{subtitle}</p>}</div>
        {actions}
      </header>
      <div class="h-64">{children /* ResponsiveContainer within */}</div>
    </section>
  );
}
```

### 3.9 Skeleton

Content-shaped shimmer blocks. Variants: `text`, `circle` (avatar), `card`, `stat`, `row`,
`chart`, `chat-bubble`. Shimmer via animated gradient; **static under `prefers-reduced-motion`**.

```css
.skeleton {
  background: linear-gradient(90deg, var(--bg-subtle) 25%, var(--surface-2) 37%, var(--bg-subtle) 63%);
  background-size: 400% 100%;
  animation: shimmer 1.4s ease-in-out infinite;
  border-radius: var(--radius-md);
}
@keyframes shimmer { 0% { background-position: 100% 0; } 100% { background-position: 0 0; } }
@media (prefers-reduced-motion: reduce) { .skeleton { animation: none; } }
```

### 3.10 Upload dropzone

Used on **Prediction** (X-ray PNG/JPEG, ≤ 10 MB per `MAX_UPLOAD_SIZE`/`ALLOWED_IMAGE_TYPES`)
and **Documents** (PDF). Keyboard-operable: focusable, Enter/Space opens the file picker; drag-
over highlights the border with `--primary`. Shows accepted types, size limit, and a **consent
reminder** for X-ray uploads. States: idle, drag-active, uploading (progress bar), success
(thumbnail/filename), error (invalid type/size or server error) with retry. `aria-describedby`
links the constraints and any error.

```html
<div role="button" tabindex="0" aria-label="Upload chest X-ray (PNG or JPEG, max 10 MB)"
  class="glass rounded-lg border-2 border-dashed border-border p-8 text-center
         hover:border-primary focus-visible:ring-2 focus-visible:ring-focus
         data-[drag=true]:border-primary data-[drag=true]:bg-primary/5">
  <UploadCloud class="mx-auto mb-2 text-primary" />
  <p class="text-body text-text">Drag an X-ray here or <span class="text-primary">browse</span></p>
  <p class="text-caption text-text-muted">PNG or JPEG · up to 10 MB</p>
</div>
```

### 3.11 Chat bubbles

User bubble: primary-tinted, right-aligned; assistant bubble: `--surface`/glass, left-aligned
with an avatar. Assistant supports **streaming** (typing indicator → token append) and a
**citation** row of chips (`document · chunk · score`). A per-message disclaimer footnote is
rendered under assistant messages. A distinct **refusal** bubble style (neutral info) is used
when RAG retrieval < `RAG_MIN_SCORE` ("insufficient context"). Bubbles enter with `motion.fast`.

### 3.12 Additional shared components

- **Confidence gauge** — radial gauge (Recharts/SVG) mapping softmax max; color follows
  risk_level; tabular-nums label.
- **Probability bars** — horizontal bars for `{NORMAL, PNEUMONIA}`.
- **Grad-CAM viewer** — tabbed original/heatmap/overlay with an opacity slider (§tabs + spring
  slider), OOD warning banner.
- **App shell** — `Sidebar`, `Topbar`, `DisclaimerStrip`, `SkipLink`, `ThemeToggle`.
- **DataTable** — sortable/paginated (History, Documents), collapses to cards below `md`.
- **EmptyState** — illustration + message + optional CTA (patterns in UI/UX §4.2).
- **Pagination** — reflects list envelope `{page, size, total, pages}`.

---

## 4. States & variants (universal)

Every interactive component implements this state matrix; visuals derive from the tokens above.

| State | Signal |
|-------|--------|
| **default** | base token colors |
| **hover** | surface/fill shift + `motion.fast` |
| **focus-visible** | 2px `--focus` ring + `--ring-offset` (keyboard only) |
| **active/pressed** | `scale-98` / darker fill |
| **disabled** | 50% opacity, no pointer events, `aria-disabled` |
| **loading** | in-component spinner + `aria-busy` (buttons) or skeleton (regions) |
| **error** | `--danger` border/text + `aria-invalid` + message |
| **success** | `--success` accent, transient |
| **selected/active-nav** | primary text + indicator (tabs, nav, table row) |

---

## 5. Iconography — Lucide

**Lucide-react** (canon §1) is the sole icon set for visual consistency. Guidelines:

- Default stroke width **1.75**, size **20px** inline / **24px** standalone; sizes snap to the
  spacing scale.
- Icons paired with text are `aria-hidden`; icon-only controls require `aria-label`.
- Icons inherit `currentColor` so they follow text tokens and theme automatically.

Canonical icon mapping:

| Concept | Lucide icon |
|---------|-------------|
| Dashboard | `layout-dashboard` |
| Prediction / analyze | `scan-line` / `activity` |
| History | `history` |
| Analytics | `bar-chart-3` |
| KnowledgeAssistant | `message-square` / `sparkles` |
| Documents | `file-text` |
| Settings | `settings` |
| Profile | `user` |
| Upload | `upload-cloud` |
| Risk low / moderate / high | `shield-check` / `alert-triangle` / `alert-octagon` |
| Success / info / warning / error toast | `check-circle` / `info` / `alert-triangle` / `x-circle` |
| Theme toggle | `sun` / `moon` |
| Role doctor / admin | `stethoscope` / `shield` |
| Disclaimer / decision-support | `info` / `stethoscope` |

---

## 6. Dark-mode strategy

- **Class strategy** (`darkMode: "class"`): a `.dark` class on `<html>` swaps the token layer
  (§1.4). This lets the toggle override the OS preference deterministically.
- **Initialization:** honor `prefers-color-scheme` on first load, then persist the user's
  explicit choice (Zustand UI store + `localStorage`), applied before paint to avoid a flash
  (inline boot script in `index.html`).
- **Toggle** lives in the Topbar (`ThemeToggle`, sun/moon) — canon §10 "prefers-color-scheme +
  toggle".
- Because components reference **semantic tokens**, not raw hex, dark mode requires no per-
  component changes. Charts recolor via the `useThemeColors` hook (§3.8). Elevation shadows and
  glass fills have dedicated dark values (§1.3, §1.7).

```html
<!-- index.html boot (pre-paint, no flash) -->
<script>
  (function () {
    var s = localStorage.getItem("aimip-theme");
    var d = s ? s === "dark"
              : matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", d);
  })();
</script>
```

---

## 7. Motion tokens

Mirrors [UI/UX Guidelines](21_UI_UX_Guidelines.md) §7 so design and behavior stay in lockstep;
implemented with **Framer Motion** under a global `MotionConfig reducedMotion="user"`.

| Token | Duration | Easing |
|-------|----------|--------|
| `fast` | 120ms | `easeOut` |
| `base` | 200ms | `cubic-bezier(0.4,0,0.2,1)` |
| `slow` | 320ms | `cubic-bezier(0.4,0,0.2,1)` |
| `spring` | — | `stiffness 300, damping 30` |

---

## 8. Accessibility guardrails in the system

- Contrast: every semantic text/bg pair in §1.3 verified to AA; do not introduce ad-hoc
  colors outside the token set.
- Focus tokens (`--focus`, `--ring-offset`) are mandatory on all interactive components.
- Risk/status meaning always carries a **label + icon**, never color alone.
- Motion tokens degrade under `prefers-reduced-motion`; glass degrades under
  `prefers-reduced-transparency`.
- Full behavioral rules: [UI/UX Guidelines](21_UI_UX_Guidelines.md) §6.

---

## 9. TailwindCSS config mapping

Tokens map into Tailwind's theme so utilities (`bg-primary`, `text-risk-high`, `rounded-md`,
`shadow-e2`) resolve to the CSS variables — one source of truth, theme-aware by construction.

```js
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // brand scales
        primary: {
          50:"#F0F9FF",100:"#E0F2FE",200:"#BAE6FD",300:"#7DD3FC",400:"#38BDF8",
          500:"#0EA5E9",600:"#0284C7",700:"#0369A1",800:"#075985",900:"#0C4A6E",950:"#082F49",
          DEFAULT:"var(--primary)", hover:"var(--primary-hover)", fg:"var(--primary-fg)",
        },
        accent: {
          50:"#F0FDFA",100:"#CCFBF1",200:"#99F6E4",300:"#5EEAD4",400:"#2DD4BF",
          500:"#14B8A6",600:"#0D9488",700:"#0F766E",800:"#115E59",900:"#134E4A",950:"#042F2E",
          DEFAULT:"var(--accent)",
        },
        // semantic (var-driven → theme-aware)
        bg:            "var(--bg)",
        "bg-subtle":   "var(--bg-subtle)",
        surface:       "var(--surface)",
        "surface-2":   "var(--surface-2)",
        glass:         "var(--glass)",
        "glass-border":"var(--glass-border)",
        border:        "var(--border)",
        text:          "var(--text)",
        "text-muted":  "var(--text-muted)",
        "text-subtle": "var(--text-subtle)",
        focus:         "var(--focus)",
        "ring-offset": "var(--ring-offset)",
        success:"var(--success)", warning:"var(--warning)",
        danger:"var(--danger)",   info:"var(--info)",
        // risk semantics
        risk: { low:"var(--risk-low)", moderate:"var(--risk-moderate)", high:"var(--risk-high)" },
      },
      fontFamily: {
        sans: ["Inter","ui-sans-serif","system-ui","-apple-system","Segoe UI","Roboto","sans-serif"],
        mono: ["JetBrains Mono","ui-monospace","SFMono-Regular","Menlo","monospace"],
      },
      fontSize: {
        caption:["0.75rem",{lineHeight:"1.4",fontWeight:"500"}],
        "body-sm":["0.875rem",{lineHeight:"1.55"}],
        body:["1rem",{lineHeight:"1.6"}],
        "body-lg":["1.125rem",{lineHeight:"1.6"}],
        h4:["1.125rem",{lineHeight:"1.35",fontWeight:"600"}],
        h3:["1.375rem",{lineHeight:"1.3",fontWeight:"600"}],
        h2:["1.75rem",{lineHeight:"1.2",fontWeight:"600"}],
        h1:["2.25rem",{lineHeight:"1.15",fontWeight:"700",letterSpacing:"-0.011em"}],
        display:["3rem",{lineHeight:"1.1",fontWeight:"700",letterSpacing:"-0.011em"}],
      },
      spacing: { // 8px scale + 4px half-steps
        0.5:"4px",1:"8px",2:"16px",3:"24px",4:"32px",5:"40px",6:"48px",8:"64px",10:"80px",12:"96px",
      },
      borderRadius: { sm:"6px", md:"12px", lg:"16px", xl:"24px", full:"9999px" },
      boxShadow: {
        e1:"var(--shadow-e1, 0 1px 2px rgba(15,23,42,0.06))",
        e2:"var(--shadow-md)",
        e3:"var(--shadow-e3, 0 10px 24px rgba(15,23,42,0.12))",
        glass:"0 8px 32px rgba(2,132,199,0.10)",
      },
      backdropBlur: { xl:"16px" },
      transitionTimingFunction: { standard:"cubic-bezier(0.4,0,0.2,1)" },
      transitionDuration: { fast:"120ms", base:"200ms", slow:"320ms" },
      screens: { sm:"640px", md:"768px", lg:"1024px", xl:"1280px","2xl":"1536px" },
    },
  },
  plugins: [require("@tailwindcss/forms"), require("@tailwindcss/typography")],
};
```

Usage examples:

```html
<!-- KPI stat card -->
<div class="glass rounded-lg p-3 shadow-e2">
  <p class="text-caption text-text-muted">Total predictions</p>
  <p class="text-h2 text-text tabular-nums">1,284</p>
</div>

<!-- Risk-high badge (color + label + icon) -->
<span class="inline-flex items-center gap-1 rounded-full px-2 py-0.5
             bg-risk-high/15 text-risk-high text-caption">
  <AlertOctagon class="h-3.5 w-3.5" aria-hidden /> High risk
</span>
```

---

## 10. Cross-references

- Behavior, states, flows, accessibility rules, disclaimer surfacing →
  [UI/UX Guidelines](21_UI_UX_Guidelines.md)
- Where components live, providers, theme store, query client →
  [Frontend Architecture](08_Frontend_Architecture.md)
- Canonical palette, pages, stack → [_CANON.md](_CANON.md) §10, §1
