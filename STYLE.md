# DejaVista - Design System

## Design Philosophy
**"Warm elegance meets intelligent styling."**

A refined, fashion-forward palette that feels premium and approachable. Visual attention is reserved for high-value AI interactions.

---

## Color Palette

### Primary Colors

#### Cream (Base Background)
```
HEX: #F5E9E2
RGB: 245, 233, 226
Usage: Side Panel container, page backgrounds, card backgrounds
```
**Purpose:** Creates a warm, inviting canvas that feels premium and fashion-forward

#### Deep Burgundy (Primary Accent)
```
HEX: #773344
RGB: 119, 51, 68
Usage: Navigation highlights, active states, branding
```
**Reserved for:**
- Active tab indicators
- Logo accents
- Section headers
- Secondary buttons

#### Coral (Action Accent)
```
HEX: #D44D5C
RGB: 212, 77, 92
Usage: AI-specific interactions, primary CTAs
```
**Reserved for:**
- "Try On" button (solid fill)
- "Match Found" pulse animation
- Buying Intent notification dot
- Primary action buttons

**Never use for:**
- Static text or icons
- Backgrounds
- Generic UI elements

#### Soft Peach (Secondary Surface)
```
HEX: #E3B5A4
RGB: 227, 181, 164
Usage: Closet tab background, inactive states, hover states
```
**Purpose:** Creates depth and warmth while complementing the cream base

#### Near Black (Dark)
```
HEX: #0B0014
RGB: 11, 0, 20
Usage: Primary text, headings, important labels
```

---

### Text Hierarchy

#### Near Black (Headings)
```
HEX: #0B0014
RGB: 11, 0, 20
Usage: Product titles, prices, primary CTAs
Font Weight: 600-700
```

#### Burgundy Muted (Secondary Text)
```
HEX: #5A3D45
RGB: 90, 61, 69
Usage: Metadata, timestamps, helper text
Font Weight: 400-500
```

#### Deep Burgundy (AI Reasoning)
```
HEX: #773344
RGB: 119, 51, 68
Usage: Gemini-generated reasoning text ONLY
Font Weight: 500
Font Style: Italic (optional, for emphasis)
```

---

## Typography

### Font Stack
```css
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, 
             "Helvetica Neue", Arial, sans-serif;
```
**Rationale:** System fonts ensure fast rendering and native OS feel

### Scale

```css
/* Headings */
h1: 24px / 1.3 / 700    /* Page titles */
h2: 20px / 1.4 / 600    /* Section headers */
h3: 16px / 1.5 / 600    /* Card titles */

/* Body */
body: 14px / 1.6 / 400      /* Default text */
small: 12px / 1.5 / 400     /* Metadata, captions */
micro: 10px / 1.4 / 500     /* Timestamps, badges */
```

---

## Spacing System

### Base Unit: 4px

```css
--space-1: 4px    /* Tight spacing (icon gaps) */
--space-2: 8px    /* Small padding */
--space-3: 12px   /* Default padding */
--space-4: 16px   /* Card padding */
--space-6: 24px   /* Section spacing */
--space-8: 32px   /* Large gaps */
--space-12: 48px  /* Page margins */
```

---

## Components

### 1. Side Panel Container
```css
background: #F5E9E2
width: 400px (fixed by Chrome)
padding: 16px
border-left: 1px solid #E3B5A4
```

### 2. Navigation Tabs
**Active State:**
```css
background: #F5E9E2
color: #0B0014
border-bottom: 2px solid #773344 (Burgundy)
font-weight: 600
```

**Inactive State:**
```css
background: transparent
color: #5A3D45
border-bottom: 2px solid transparent
font-weight: 400

hover:
  color: #0B0014
  border-bottom: 2px solid #E3B5A4
```

### 3. Product Card
```css
background: #FFFFFF
border: 1px solid #E3B5A4
border-radius: 8px
padding: 16px
box-shadow: 0 1px 3px rgba(11, 0, 20, 0.05)

hover:
  box-shadow: 0 4px 12px rgba(11, 0, 20, 0.1)
  border-color: #773344
```

### 4. AI Match Card (Special Variant)
```css
background: linear-gradient(135deg, #FFFFFF 0%, #F5E9E2 100%)
border: 2px solid #D44D5C (Coral)
border-radius: 12px
padding: 16px
position: relative

/* Glow effect */
box-shadow: 0 0 0 4px rgba(212, 77, 92, 0.1),
            0 4px 12px rgba(212, 77, 92, 0.15)
```

**Reasoning Text:**
```css
color: #773344 (Burgundy)
font-size: 14px
line-height: 1.6
font-style: italic
margin-top: 12px
padding: 12px
background: rgba(119, 51, 68, 0.05)
border-radius: 6px
border-left: 3px solid #773344
```

### 5. Buttons

#### Primary (AI Actions)
```css
background: #D44D5C (Coral)
color: #FFFFFF
padding: 12px 24px
border-radius: 8px
font-weight: 600
font-size: 14px
border: none
cursor: pointer

hover:
  background: #BF3A48
  transform: translateY(-1px)
  box-shadow: 0 4px 12px rgba(212, 77, 92, 0.3)

active:
  transform: translateY(0)
  box-shadow: 0 2px 4px rgba(212, 77, 92, 0.2)

disabled:
  background: #E3B5A4
  color: #5A3D45
  cursor: not-allowed
```

#### Secondary (Generic Actions)
```css
background: #FFFFFF
color: #773344
padding: 12px 24px
border-radius: 8px
font-weight: 500
font-size: 14px
border: 1px solid #773344
cursor: pointer

hover:
  background: #F5E9E2
  border-color: #5A3D45
```

#### Destructive (Purge, Delete)
```css
background: #FFFFFF
color: #D44D5C
padding: 12px 24px
border-radius: 8px
font-weight: 500
font-size: 14px
border: 1px solid #D44D5C
cursor: pointer

hover:
  background: rgba(212, 77, 92, 0.05)
  border-color: #BF3A48
```

### 6. Loading States

#### Skeleton Card
```css
background: linear-gradient(
  90deg,
  #F5E9E2 0%,
  #E3B5A4 50%,
  #F5E9E2 100%
)
background-size: 200% 100%
animation: shimmer 1.5s infinite
border-radius: 8px
```

#### Spinner (AI Processing)
```css
width: 24px
height: 24px
border: 3px solid #E3B5A4
border-top-color: #D44D5C (Coral)
border-radius: 50%
animation: spin 0.8s linear infinite
```

### 7. Notification Dot (Buying Intent)
```css
position: absolute
top: 8px
right: 8px
width: 10px
height: 10px
background: #D44D5C (Coral)
border-radius: 50%
animation: pulse 2s infinite
```

### 8. Input Fields

#### Text Input
```css
background: #FFFFFF
border: 1px solid #E3B5A4
border-radius: 6px
padding: 10px 12px
font-size: 14px
color: #0B0014

focus:
  outline: none
  border-color: #773344
  box-shadow: 0 0 0 3px rgba(119, 51, 68, 0.1)

placeholder:
  color: #5A3D45
```

#### Toggle Switch
```css
/* Track */
width: 44px
height: 24px
background: #E3B5A4
border-radius: 12px
cursor: pointer

/* Thumb */
width: 20px
height: 20px
background: #FFFFFF
border-radius: 50%
transform: translateX(2px)
transition: transform 0.2s

/* Active State */
background: #D44D5C (Coral)
thumb transform: translateX(22px)
```

---

## CSS Custom Properties

```css
:root {
  /* Colors */
  --color-base: #F5E9E2;
  --color-base-white: #FFFFFF;
  --color-accent: #773344;
  --color-accent-action: #D44D5C;
  --color-accent-hover: #BF3A48;
  --color-surface: #E3B5A4;
  --color-text-primary: #0B0014;
  --color-text-secondary: #5A3D45;
  --color-text-ai: #773344;
  --color-border: #E3B5A4;
  
  /* Radii */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  
  /* Shadows */
  --shadow-sm: 0 1px 3px rgba(11, 0, 20, 0.05);
  --shadow-md: 0 4px 12px rgba(11, 0, 20, 0.1);
  --shadow-ai: 0 0 0 4px rgba(212, 77, 92, 0.1);
  
  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  --space-12: 48px;
  
  /* Animation */
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
  --duration-fast: 150ms;
  --duration-base: 250ms;
  --duration-slow: 400ms;
}
```

---

## Accessibility

### Focus States
```css
:focus-visible {
  outline: 2px solid #773344
  outline-offset: 2px
}
```

### Color Contrast (WCAG AA)
- `#0B0014` on `#F5E9E2` → 15.4:1 ✓
- `#5A3D45` on `#F5E9E2` → 5.8:1 ✓
- `#773344` on `#F5E9E2` → 6.1:1 ✓
- `#FFFFFF` on `#D44D5C` → 4.6:1 ✓
- `#FFFFFF` on `#773344` → 7.2:1 ✓