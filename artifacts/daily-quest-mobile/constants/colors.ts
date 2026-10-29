/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const dark = {
  text: '#F7F5FF',
  tint: '#9B85FF',
  background: '#12131A',
  foreground: '#F7F5FF',
  card: '#1C1E28',
  cardForeground: '#F7F5FF',
  primary: '#7C5CFF',
  primaryForeground: '#FFFFFF',
  secondary: '#252838',
  secondaryForeground: '#E9E6FF',
  muted: '#252838',
  mutedForeground: '#9498AA',
  accent: '#FFB020',
  accentForeground: '#17130A',
  destructive: '#FF6B78',
  destructiveForeground: '#FFFFFF',
  border: '#2C3040',
  input: '#303447',
  purpleSoft: '#302668',
  purpleBright: '#A58FFF',
  amberSoft: '#4B3510',
  success: '#72E2AE',
  white: '#FFFFFF',
};

const colors = {
  light: dark,
  dark,

  // Border radius (in px). Sync from the sibling web artifact's --radius
  // CSS variable. This value applies to cards, buttons, inputs, and modals.
  radius: 8,
};

export default colors;
