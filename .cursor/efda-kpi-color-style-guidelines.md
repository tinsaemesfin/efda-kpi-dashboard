# EFDA KPI Dashboard Color & Style Guidelines

## 1. Product Design Direction

The EFDA KPI Dashboard is a regulatory performance dashboard for monitoring Clinical Trials, GMP Inspections, and Market Authorizations. The visual design should feel trustworthy, government-appropriate, clean, professional, and data-heavy but easy to scan.

The interface should not feel like a flashy consumer product, crypto dashboard, generic SaaS template, or marketing landing page. It should feel like a serious internal regulatory dashboard used by staff, managers, and leadership.

---

## 2. Design Personality

### The dashboard should feel:

- Trustworthy
- Official
- Calm
- Clear
- Professional
- Analytical
- Data-driven
- Accessible
- Government-grade
- Executive-friendly

### The dashboard should avoid:

- Overly bright colors
- Heavy gradients
- Neon accents
- Decorative illustrations
- Unnecessary animations
- Large colorful card backgrounds
- Too many charts on the home page
- Crowded UI with no spacing
- Generic dashboard styling

---

## 3. Primary Brand Colors

### Primary Color: Deep Regulatory Blue

```css
--color-primary: #1E3A8A;
```

Use this as the main brand color. It should represent trust, authority, reliability, and institutional seriousness.

Best used for:

- Primary buttons
- Sidebar active state
- Header accents
- Important links
- Focus rings
- Selected navigation items
- High-level dashboard identity

Avoid using this as a full-page background unless the layout is very controlled.

---

### Secondary Color: Regulatory Teal

```css
--color-secondary: #0F766E;
```

Use this as the supporting brand color. It gives the dashboard a health, regulatory, and operational feeling without becoming too bright.

Best used for:

- Secondary buttons
- Operational status chips
- System health indicators
- Supporting highlights
- Subtle dashboard accents

---

## 4. Program Accent Colors

The dashboard covers three regulatory programs. Each program should have its own accent color. These colors should be used consistently across cards, icons, section headers, badges, and lightweight charts.

| Program | Accent Color | Hex | Usage |
|---|---:|---:|---|
| Clinical Trials | Blue | `#2563EB` | Clinical Trials cards, section icons, KPI accents |
| GMP Inspections | Green | `#16A34A` | GMP cards, section icons, KPI accents |
| Market Authorizations | Purple | `#7C3AED` | MA cards, section icons, KPI accents |

### CSS Tokens

```css
--color-clinical-trials: #2563EB;
--color-gmp-inspections: #16A34A;
--color-market-authorizations: #7C3AED;
```

### Program Color Usage Rules

Use program colors for:

- Section icon backgrounds
- Small top border accents on cards
- Program badges
- KPI section labels
- CTA accents
- Lightweight chart lines
- Program summary card highlights

Do not use program colors for:

- Large full-card backgrounds
- Main page background
- Body text
- Long paragraphs
- Excessive decorative gradients

---

## 5. Neutral UI Palette

The dashboard should use a neutral base so the KPI values and status indicators remain clear.

```css
--color-background: #F8FAFC;
--color-surface: #FFFFFF;
--color-surface-muted: #F1F5F9;
--color-border: #E2E8F0;
--color-border-strong: #CBD5E1;
--color-text-primary: #0F172A;
--color-text-secondary: #475569;
--color-text-muted: #64748B;
--color-text-subtle: #94A3B8;
```

### Usage

| Token | Usage |
|---|---|
| Background | Main dashboard background |
| Surface | Cards, top bar, sidebar panels |
| Surface muted | Subtle stat blocks, icon backgrounds, inactive areas |
| Border | Card borders, dividers, input borders |
| Text primary | Main headings, KPI values |
| Text secondary | Descriptions, labels |
| Text muted | Supporting metadata |
| Text subtle | Very low-priority helper text |

---

## 6. Status Colors

KPI status badges should use a fixed vocabulary. Do not rely on color only. Always include readable text and, where useful, an icon.

| Status | Color | Hex | Meaning |
|---|---:|---:|---|
| Excellent | Green | `#16A34A` | Performing very well |
| Good | Blue | `#2563EB` | Performing acceptably |
| Warning | Amber | `#D97706` | Needs attention |
| Critical | Red | `#DC2626` | Requires urgent action |

### CSS Tokens

```css
--color-status-excellent: #16A34A;
--color-status-good: #2563EB;
--color-status-warning: #D97706;
--color-status-critical: #DC2626;
```

### Status Badge Rules

Each status badge should include:

- Status label text
- Accessible color contrast
- Optional icon
- Soft background tint
- Clear border or outline

Example badge style:

```css
.status-badge {
  border-radius: 9999px;
  padding: 0.25rem 0.625rem;
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1rem;
}
```

---

## 7. Typography

### Recommended Fonts

```css
--font-sans: "Geist Sans", Inter, system-ui, sans-serif;
--font-mono: "Geist Mono", "SFMono-Regular", Consolas, monospace;
```

### Font Usage

| Font | Usage |
|---|---|
| Geist Sans | Main UI, body text, headings, buttons, cards |
| Geist Mono | KPI codes, compact data labels, system-like identifiers |

### Type Scale

```css
--text-xs: 0.75rem;
--text-sm: 0.875rem;
--text-base: 1rem;
--text-lg: 1.125rem;
--text-xl: 1.25rem;
--text-2xl: 1.5rem;
--text-3xl: 1.875rem;
--text-4xl: 2.25rem;
```

### Typography Guidelines

- KPI values should be visually dominant.
- Section titles should be clear but not oversized.
- Descriptions should be muted and concise.
- KPI codes should be smaller and preferably mono-spaced.
- Avoid using too many font weights.

Recommended weights:

```css
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

---

## 8. Layout & Spacing

Use an 8px spacing system.

```css
--space-1: 0.25rem;  /* 4px */
--space-2: 0.5rem;   /* 8px */
--space-3: 0.75rem;  /* 12px */
--space-4: 1rem;     /* 16px */
--space-5: 1.25rem;  /* 20px */
--space-6: 1.5rem;   /* 24px */
--space-8: 2rem;     /* 32px */
--space-10: 2.5rem;  /* 40px */
--space-12: 3rem;    /* 48px */
```

### Page Spacing

Desktop:

```css
main {
  padding: 24px 32px;
}
```

Tablet:

```css
main {
  padding: 20px 24px;
}
```

Mobile:

```css
main {
  padding: 16px;
}
```

### Grid Rules

Program summary cards:

- Desktop: 3 columns
- Tablet: 2 columns or stacked depending on width
- Mobile: 1 column

KPI metric grid:

- Desktop: 4 columns
- Tablet: 2 columns
- Mobile: 1 column

---

## 9. Border Radius

Use soft but professional rounded corners.

```css
--radius-sm: 0.375rem;
--radius-md: 0.5rem;
--radius-lg: 0.75rem;
--radius-xl: 1rem;
--radius-2xl: 1.25rem;
```

Recommended usage:

| Element | Radius |
|---|---|
| Buttons | `--radius-md` or `--radius-lg` |
| Cards | `--radius-xl` |
| Large panels | `--radius-2xl` |
| Badges | Full pill radius |
| Inputs | `--radius-md` |

---

## 10. Shadows & Borders

The dashboard should use subtle borders more than heavy shadows.

```css
--shadow-sm: 0 1px 2px rgba(15, 23, 42, 0.06);
--shadow-md: 0 8px 24px rgba(15, 23, 42, 0.08);
--shadow-card: 0 1px 2px rgba(15, 23, 42, 0.04);
```

### Rules

- Default cards should use a border and very light shadow.
- Avoid dramatic shadows.
- Use hover shadows carefully and only to show interactivity.
- Government dashboard UI should feel stable, not floating or playful.

Recommended card style:

```css
.card {
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  border-radius: 1rem;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}
```

---

## 11. Component Style Guidelines

## App Shell

The dashboard should sit inside a consistent application shell.

### Sidebar

Sidebar should include:

- Brand block: “EFDA KPI / Dashboard”
- Main navigation
- KPI category navigation
- Optional user block with avatar, name, email, and role

Style:

- Neutral surface
- Subtle border-right
- Clear active state
- Program icons should use controlled program colors
- Keep navigation labels readable

### Top Bar

Top bar should include:

- Sidebar toggle
- Global search input
- User menu
- Profile/logout actions

Style:

- Sticky
- Subtle blur
- Border-bottom
- Neutral background
- High readability

Example:

```css
.topbar {
  position: sticky;
  top: 0;
  z-index: 40;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid #E2E8F0;
}
```

---

## 12. KPI Card Style

KPI cards are the atomic unit of the dashboard.

Each KPI card should include:

- Short title
- KPI code where relevant
- Large value
- Suffix such as %, days, count
- Description or numerator/denominator
- Optional trend
- Status badge

### KPI Card Hierarchy

1. Status/category context
2. KPI title
3. Large KPI value
4. Description
5. Trend/status details

### KPI Card Rules

- The number should be the hero.
- Titles should wrap gracefully.
- Descriptions should be short.
- KPI codes should be visible but secondary.
- Use consistent padding.
- Avoid unnecessary charts inside every card.

Recommended structure:

```txt
[Program/KPI Code]        [Status Badge]
KPI Title

87.4%
Target: 80% minimum

↑ +2.1% from previous period
```

---

## 13. Program Summary Card Style

Program summary cards should introduce the three main regulatory programs equally.

Each card should include:

- Program icon
- Program name
- KPI count summary
- Two headline stats
- Short description
- CTA link/button

### Program Summary Rules

- Keep all three cards visually equal.
- Use program color as an accent only.
- Do not use full saturated card backgrounds.
- Use a subtle tinted icon box.
- CTA should clearly suggest drill-down.

Example CTA labels:

- View Clinical Trials
- View GMP
- View Market Authorizations

---

## 14. Section Style

Each program section should follow the same structure:

1. Section header
2. Primary KPI grid
3. Secondary KPI row

### Section Header

Should include:

- Icon in tinted rounded square
- H2 title
- One-line description
- CTA badge or button: “View all N KPIs”

### Section Order

Always use this order on the main dashboard:

1. Clinical Trials
2. GMP Inspections
3. Market Authorizations

This creates a stable and predictable executive summary flow.

---

## 15. Buttons

### Primary Button

```css
.button-primary {
  background: #1E3A8A;
  color: #FFFFFF;
  border-radius: 0.5rem;
  font-weight: 600;
}
```

Use for:

- Primary dashboard actions
- Main drill-down actions
- High-priority navigation

### Secondary Button

```css
.button-secondary {
  background: #FFFFFF;
  color: #0F172A;
  border: 1px solid #CBD5E1;
  border-radius: 0.5rem;
  font-weight: 600;
}
```

Use for:

- Secondary actions
- Filters
- Export options
- Period selectors

### Ghost Button

Use for:

- Sidebar toggle
- Icon actions
- Lightweight navigation actions

---

## 16. Inputs & Search

Search should feel useful but not dominate the dashboard.

Search placeholder:

```txt
KPIs, reports…
```

Search style:

- Rounded input
- Subtle border
- Neutral background
- Clear focus state
- Icon on the left if useful

Focus ring:

```css
:focus-visible {
  outline: 2px solid #2563EB;
  outline-offset: 2px;
}
```

---

## 17. Charts

The main dashboard should not be chart-heavy.

Charts may be used only if they improve executive summary clarity.

Recommended home dashboard charts:

- Overall KPI performance over time
- Cross-program comparison

Chart rules:

- Use minimal labels
- Avoid heavy legends
- Use program colors consistently
- Do not add charts just for decoration
- Detailed charts belong on sub-pages

---

## 18. Dark Mode Guidelines

If dark mode is supported, keep it calm and readable.

```css
--dark-background: #020617;
--dark-surface: #0F172A;
--dark-surface-muted: #1E293B;
--dark-border: #334155;
--dark-text-primary: #F8FAFC;
--dark-text-secondary: #CBD5E1;
--dark-text-muted: #94A3B8;
```

Dark mode rules:

- Avoid pure black cards.
- Keep contrast strong.
- Use program colors slightly softer if they feel too bright.
- Preserve status label text.
- Do not rely only on color.

---

## 19. Accessibility Rules

The dashboard must be accessible for internal government/regulatory users.

Required:

- Clear heading hierarchy
- Keyboard-accessible navigation
- Visible focus states
- Accessible color contrast
- Status labels with text
- Icon buttons with aria-labels
- Search input with proper label
- Charts with readable labels/tooltips
- No color-only communication
- Comfortable tap targets on mobile

Status badges must include text:

```txt
Excellent
Good
Warning
Critical
```

Do not show status using only colored dots.

---

## 20. Responsive Rules

### Desktop

- Sidebar visible
- Top bar sticky
- Program cards in 3 columns
- KPI grid in 4 columns
- Comfortable content padding

### Tablet

- Sidebar collapsible
- KPI grid in 2 columns
- Program cards may become 2 columns or stacked

### Mobile

- Sidebar off-canvas
- Top bar remains sticky
- Search collapses or becomes compact
- Program cards stack
- KPI cards stack
- Overall performance strip becomes stacked cards
- No horizontal scrolling

---

## 21. Tailwind Theme Example

```js
const theme = {
  colors: {
    primary: "#1E3A8A",
    secondary: "#0F766E",
    clinical: "#2563EB",
    gmp: "#16A34A",
    market: "#7C3AED",
    background: "#F8FAFC",
    surface: "#FFFFFF",
    border: "#E2E8F0",
    text: {
      primary: "#0F172A",
      secondary: "#475569",
      muted: "#64748B",
      subtle: "#94A3B8",
    },
    status: {
      excellent: "#16A34A",
      good: "#2563EB",
      warning: "#D97706",
      critical: "#DC2626",
    },
  },
  borderRadius: {
    sm: "0.375rem",
    md: "0.5rem",
    lg: "0.75rem",
    xl: "1rem",
    "2xl": "1.25rem",
  },
  boxShadow: {
    sm: "0 1px 2px rgba(15, 23, 42, 0.06)",
    md: "0 8px 24px rgba(15, 23, 42, 0.08)",
    card: "0 1px 2px rgba(15, 23, 42, 0.04)",
  },
};
```

---

## 22. Cursor / UI UX Pro Max Usage Prompt

Use this prompt in Cursor when redesigning the dashboard:

```txt
Use UI/UX Pro Max skill and the EFDA KPI Dashboard color and style guidelines.

Apply the following visual direction:
- Primary brand color: #1E3A8A
- Secondary color: #0F766E
- Clinical Trials accent: #2563EB
- GMP Inspections accent: #16A34A
- Market Authorizations accent: #7C3AED
- Background: #F8FAFC
- Cards: #FFFFFF
- Border: #E2E8F0
- Main text: #0F172A

Design style:
- Government-grade
- Trustworthy
- Clean
- Professional
- Data-heavy but scannable
- Executive summary first
- Not flashy
- Not generic SaaS

Use program colors only as accents for icons, badges, borders, and chart lines. Do not create full colorful cards.

Create reusable components and make the dashboard responsive, accessible, and production-ready.
```

---

## 23. Final Design Rule

The EFDA KPI Dashboard should feel like a reliable regulatory command center.

Every color, card, chart, and interaction should help users answer:

- How are the three regulatory programs performing?
- Which KPIs are healthy?
- Which KPIs need attention?
- Where should I drill down next?

If a visual element does not help answer those questions, remove it.
