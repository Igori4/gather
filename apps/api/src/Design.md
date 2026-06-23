---
name: Gather Soft Humanist
colors:
  surface: '#fff8f4'
  surface-dim: '#e1d8d3'
  surface-bright: '#fff8f4'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fbf2ec'
  surface-container: '#f5ece6'
  surface-container-high: '#efe6e1'
  surface-container-highest: '#eae1db'
  on-surface: '#1f1b18'
  on-surface-variant: '#57423d'
  inverse-surface: '#34302c'
  inverse-on-surface: '#f8efe9'
  outline: '#8b716c'
  outline-variant: '#dfc0ba'
  surface-tint: '#a73927'
  primary: '#a73927'
  on-primary: '#ffffff'
  primary-container: '#f27059'
  on-primary-container: '#650700'
  inverse-primary: '#ffb4a6'
  secondary: '#51634e'
  on-secondary: '#ffffff'
  secondary-container: '#d1e6cb'
  on-secondary-container: '#556852'
  tertiary: '#685d4f'
  on-tertiary: '#ffffff'
  tertiary-container: '#a39687'
  on-tertiary-container: '#382f24'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad4'
  primary-fixed-dim: '#ffb4a6'
  on-primary-fixed: '#3f0300'
  on-primary-fixed-variant: '#862112'
  secondary-fixed: '#d3e8ce'
  secondary-fixed-dim: '#b8ccb3'
  on-secondary-fixed: '#0f1f0f'
  on-secondary-fixed-variant: '#394b38'
  tertiary-fixed: '#f0e0cf'
  tertiary-fixed-dim: '#d3c4b4'
  on-tertiary-fixed: '#221a10'
  on-tertiary-fixed-variant: '#4f4539'
  background: '#fff8f4'
  on-background: '#1f1b18'
  surface-variant: '#eae1db'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  margin-page: 24px
  gutter: 16px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style

The brand personality centers on the concept of "togetherness." The design system evokes feelings of warmth, safety, and effortless coordination. It aims to reduce the anxiety of social planning by providing a visual environment that feels like a comfortable physical space.

The style is a blend of **Minimalism** and **Modern** design movements. It prioritizes clarity and heavy whitespace to reduce cognitive load, while using a sophisticated color palette to maintain a "human" feel. This is a low-friction interface where every transition and element feels intentional and welcoming, moving away from cold, clinical tech aesthetics toward a grounded, lifestyle-oriented experience.

## Colors

This design system utilizes a palette inspired by natural transitions and organic materials.

- **Sunset Orange (Primary):** Used for primary actions and key brand moments. It conveys energy and social warmth.
- **Sage Green (Secondary):** Used for success states, secondary coordination tags, and balanced accents. It provides a grounding effect.
- **Warm Neutrals:** A range of clay-tinted grays and off-whites are used for backgrounds and text to avoid the harshness of pure black or white.
- **Surface Colors:** Backgrounds lean toward a very soft cream to maintain a tactile, paper-like quality that feels more approachable than a standard digital white.

## Typography

The choice of **Plus Jakarta Sans** provides a friendly, optimistic, and contemporary feel. Its soft curves mirror the roundedness of the UI components, creating a cohesive visual rhythm.

Headlines should be set with tighter letter spacing to create a modern, editorial look. Body text utilizes a generous line height to ensure maximum legibility during quick scanning of event details. The hierarchy is designed to guide the eye from the "what" (headline) to the "when/where" (labels and body) without visual clutter.

## Layout & Spacing

This design system uses a **fluid grid** based on an 8px rhythm. The layout philosophy is centered on "breathing room." Content is rarely cramped; instead, it is grouped into logical clusters with distinct margins.

Page margins are set to a minimum of 24px on mobile to ensure the interface doesn't feel confined to the edges of the device. Vertical spacing (stacking) is used to create a clear narrative flow, with larger gaps (32px+) used to separate distinct sections of information, such as "Event Details" from "Guest List."

## Elevation & Depth

Visual hierarchy is achieved primarily through **tonal layers** and **ambient shadows**.

- **Depth Tiers:** Instead of heavy shadows, the system uses subtle color shifts in background surfaces to indicate nesting (e.g., a slightly darker neutral for a container background).
- **Shadow Quality:** Where shadows are necessary (such as for floating action buttons or primary cards), they are extra-diffused with low opacity (10-15%) and a slight tint of the Primary or Secondary color. This prevents "dirty" gray shadows and keeps the UI feeling warm and illuminated by natural light.
- **Glassmorphism:** Occasional use of backdrop blurs on navigation overlays provides a sense of context and place, ensuring the user never feels "lost" in a sub-menu.

## Shapes

The shape language is organic and soft. By using a **Rounded** (Level 2) corner radius, the design system avoids sharp points that can feel aggressive or overly formal.

- **Standard Components:** Buttons and input fields use a 0.5rem (8px) radius.
- **Containers:** Large cards and modals use a 1rem (16px) or 1.5rem (24px) radius to emphasize the "contained" and safe nature of the content.
- **Pills:** Interactive tags and status chips should use fully rounded (pill-shaped) ends to differentiate them from actionable buttons.

## Components

- **Buttons:** Primary buttons feature Sunset Orange with white text. They should have ample horizontal padding (min 24px) to feel substantial and easy to tap. Secondary buttons use Sage Green or a subtle neutral outline.
- **Cards:** The central component for social coordination. Cards should have a soft, low-opacity tinted shadow and 24px internal padding. Avoid heavy borders; use subtle surface color changes to define boundaries.
- **Inputs:** Text fields use a soft, grounded neutral background with a thicker 2px border on focus in Sunset Orange. Labels should always be visible above the field for accessibility.
- **Chips & Tags:** Use these for RSVPs or categories. "Attending" tags use Sage Green, while "Pending" tags use a soft neutral. They are always pill-shaped.
- **Lists:** Use generous vertical padding between list items (16px) with thin, light dividers that do not span the full width of the container.
- **Coordination Specifics:** Progress bars for "Gathering Goals" (e.g., "5 more people needed") should use a rounded track with the Sage Green fill.
