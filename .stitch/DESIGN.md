---
name: HealthManager Bold Tech
colors:
  background: '#f8fafc'
  surface: '#ffffff'
  surface-raised: '#ffffff'
  surface-inverse: '#0f172a'
  border: '#d1d5db'
  border-strong: '#9ca3af'
  on-surface: '#1e293b'
  on-surface-variant: '#374151'
  on-surface-muted: '#6b7280'
  primary: '#6366f1'
  primary-strong: '#4f46e5'
  primary-soft: '#e0e7ff'
  primary-wash: 'rgba(99,102,241,0.08)'
  on-primary: '#ffffff'
  secondary: '#e5e7eb'
  on-secondary: '#374151'
  accent: '#e0e7ff'
  on-accent: '#374151'
  muted: '#f3f4f6'
  muted-foreground: '#6b7280'
  card: '#ffffff'
  card-foreground: '#1e293b'
  popover: '#ffffff'
  popover-foreground: '#1e293b'
  sidebar-bg: '#f3f4f6'
  sidebar-hover: '#e0e7ff'
  sidebar-active: '#e0e7ff'
  sidebar-text: '#1e293b'
  sidebar-text-active: '#4f46e5'
  sidebar-primary: '#6366f1'
  sidebar-border: '#d1d5db'
  destructive: '#ef4444'
  destructive-foreground: '#ffffff'
  ring: '#6366f1'
  input: '#d1d5db'
  success: '#16a34a'
  warning: '#ca8a04'
  danger: '#ef4444'
  surface-success: 'rgba(22,163,74,0.08)'
  surface-danger: 'rgba(239,68,68,0.08)'
  surface-warning: 'rgba(202,138,4,0.08)'
  chart-1: '#6366f1'
  chart-2: '#4f46e5'
  chart-3: '#4338ca'
  chart-4: '#3730a3'
  chart-5: '#312e81'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.03em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.02em
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-base:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: '0'
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: '0'
  label-caps:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.06em
  stat-lg:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.02em
  mono-sm:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: '0'
rounded:
  sm: 4px
  md: 8px
  lg: 12px
  xl: 16px
  full: 9999px
  DEFAULT: 0.5rem
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 24px
  margin-desktop: 32px
  section-gap: 24px
---

# Design System: HealthManager Bold Tech

## 1. Visual Theme & Atmosphere

HealthManager Bold Tech is a modern SaaS clinic management platform. Visual language: clean, information-dense, tech-forward without feeling cold. Palette uses light slate base (`#f8fafc`) with crisp white card surfaces — high-clarity canvas that keeps focus on data. Brand indigo (`#6366f1`) anchors all interactive elements, bringing contemporary SaaS energy that feels trustworthy and capable.

Typography uses **Inter** — the definitive modern interface font. **JetBrains Mono** appears for codes, IDs, timestamps. Spacing is intentional: 24px section gaps, 20–24px card padding. Result: interface engineers and clinic admins both trust.

## 2. Color Palette & Roles

### Primary Foundation
- **Slate Wash** `#f8fafc` — Page background canvas
- **Clean White** `#ffffff` — Card and panel surfaces, input backgrounds
- **Light Gray Sidebar** `#f3f4f6` — Navigation sidebar; clean, minimal

### Interactive & Brand
- **Indigo** `#6366f1` — Primary brand; buttons, focus rings, active states
- **Indigo Strong** `#4f46e5` — Hover state for primary actions
- **Indigo Wash** `rgba(99,102,241,0.08)` — Subtle brand-tinted backgrounds
- **Indigo Soft** `#e0e7ff` — Accent fills, sidebar active states, chips

### Typography & Text Hierarchy
- **Slate Dark** `#1e293b` — Primary text, headings, key data
- **Slate Mid** `#374151` — Secondary labels, descriptions
- **Slate Muted** `#6b7280` — Placeholder, tertiary labels, timestamps

### Functional States
- **Success** `#16a34a` — Confirmed appointments, paid, active
- **Danger** `#ef4444` — Cancelled, overdue, errors
- **Warning** `#ca8a04` — Pending, partial, attention required
- Each state: `rgba(color, 0.08)` surface tint for backgrounds

## 3. Typography Rules

- **Display**: Inter 700, 36px, tracking `-0.03em` — page-level hero metrics
- **Headline MD**: Inter 700, 24px, tracking `-0.02em` — section titles
- **Headline SM**: Inter 600, 18px, tracking `-0.01em` — card headings
- **Body Base**: Inter 400, 16px — main body copy
- **Body SM**: Inter 400–500, 14px — table rows, sidebar items, form labels
- **Label Caps**: Inter 500, 11px, `0.06em` tracking, uppercase — metadata categories
- **Stat Large**: Inter 700, 28px, tight tracking — metric values
- **Mono SM**: JetBrains Mono 400, 13px — IDs, timestamps, patient numbers

## 4. Component Stylings

### Buttons
Radius `8px`, padding `0.55rem 1rem`, font 14px/500, 150ms ease.
- **Primary**: Indigo `#6366f1`, white text → hover `#4f46e5`
- **Ghost**: Transparent, `#d1d5db` border → hover muted bg
- **Brand Outline**: Indigo wash bg, indigo soft border, indigo strong text
- **Danger**: Red-tinted bg, red text/border
- Focus: `0 0 0 3px rgba(99,102,241,0.2)` ring

### Cards & Containers
- **Panel**: White, `1px #d1d5db` border, shadow `0 1px 3px rgba(0,0,0,0.07)`, radius `12px`
- **Data Card**: Panel + `1.25rem` padding, hover border → `#9ca3af`
- **Metric Card**: Panel + `1.25rem` padding — label cap, large stat, muted subtitle
- **Appointment Card**: Data card + `3px` left border in status color

### Navigation (Sidebar)
- Light sidebar `#f3f4f6`, full-height, `200px` wide
- **Brand badge**: 32×32px, indigo `#6366f1` fill, white initials, radius `8px`
- **Nav items**: 14px/450, `#374151`, radius `6px`, padding `0.55rem 0.75rem`
- **Hover**: `#e0e7ff` bg, `#4f46e5` text
- **Active**: `#e0e7ff` bg, `#4f46e5` text, weight 600
- Right border: `1px solid #e5e7eb`

### Inputs & Forms
- Radius `8px`, border `1px #d1d5db`, white bg, 14px
- Focus: border `#6366f1`, indigo ring

### Status Badges
- Radius `4px`, padding `0.22rem 0.55rem`, 11px/600, dot via `::before`
- Confirmed → green `#16a34a`
- Scheduled → indigo `#6366f1`
- Pending → amber `#ca8a04`
- Cancelled → red `#ef4444`

## 5. Layout Principles

- **App Shell**: Fixed sidebar left + scrollable main right
- **Dashboard**: 2fr + 0.8fr columns at ≥1024px
- **Metrics**: 4-column at ≥1024px, 2-column below
- **Sidebar**: 200px fixed at ≥1025px
- `32px` horizontal padding in main content
- `24px` section gaps, `20px` card padding

## 6. Design System Notes for Stitch Generation

### Language
- "Modern SaaS dashboard", "clinic management platform", "clean tech interface"
- "Light slate background with white card surfaces"
- "Light gray sidebar with indigo active states"
- "Inter font, tight negative tracking on headings"
- "Minimal shadows, subtle 1px borders, professional SaaS feel"

### Color References
- Page background: `#f8fafc`
- Card surface: `#ffffff`
- Brand primary: Indigo `#6366f1`
- Sidebar: Light gray `#f3f4f6`
- Text primary: `#1e293b`
- Border: `#d1d5db`

### Component Prompts
- "Dashboard with light gray sidebar, indigo active nav items, 4-column metric cards (appointments, revenue, patients, pending), 2-column grid with appointment list and patient summary"
- "Appointment card with colored left border (green=confirmed, indigo=scheduled, amber=pending, red=cancelled)"
- "Patient table with indigo status badges, avatar initials on indigo background, white card on slate page"
