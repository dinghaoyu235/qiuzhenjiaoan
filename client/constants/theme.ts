export const Colors = {
  light: {
    textPrimary: "#1C1917",
    textSecondary: "#78716c",
    textMuted: "#9CA3AF",
    primary: "#1678D1", // Cornflower Blue - 品牌主色，清爽明快，专业正式
    accent: "#4BA3F2", // Lighter blue accent - 辅助色，代表创新
    success: "#10B981", // Emerald-500
    error: "#EF4444",
    backgroundRoot: "#F8FAFC", // Light blue-tinted background
    backgroundDefault: "#FFFFFF",
    backgroundTertiary: "#F0F4F8", // Tertiary background with blue tint
    buttonPrimaryText: "#FFFFFF",
    tabIconSelected: "#1678D1",
    border: "#E5E7EB",
    borderLight: "#F3F4F6",
  },
  dark: {
    textPrimary: "#FAFAF9",
    textSecondary: "#A8A29E",
    textMuted: "#6F767E",
    primary: "#4BA3F2", // Lighter blue for dark mode visibility
    accent: "#1678D1", // Main blue as accent in dark mode
    success: "#34D399",
    error: "#F87171",
    backgroundRoot: "#0A1628", // Deep blue-tinted dark background
    backgroundDefault: "#1A2742", // Dark blue-tinted default background
    backgroundTertiary: "#22334D", // Dark mode tertiary background
    buttonPrimaryText: "#FFFFFF",
    tabIconSelected: "#4BA3F2",
    border: "#2D3A4F",
    borderLight: "#1F2A3A",
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
  "6xl": 64,
};

export const BorderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 28,
  "4xl": 32,
  full: 9999,
};

export const Typography = {
  display: {
    fontSize: 112,
    lineHeight: 112,
    fontWeight: "200" as const,
    letterSpacing: -4,
  },
  displayLarge: {
    fontSize: 112,
    lineHeight: 112,
    fontWeight: "200" as const,
    letterSpacing: -2,
  },
  displayMedium: {
    fontSize: 48,
    lineHeight: 56,
    fontWeight: "200" as const,
  },
  h1: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: "700" as const,
  },
  h2: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: "700" as const,
  },
  h3: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "300" as const,
  },
  h4: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "600" as const,
  },
  title: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700" as const,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400" as const,
  },
  bodyMedium: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "500" as const,
  },
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400" as const,
  },
  smallMedium: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500" as const,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "400" as const,
  },
  captionMedium: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500" as const,
  },
  label: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500" as const,
    letterSpacing: 2,
    textTransform: "uppercase" as const,
  },
  labelSmall: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500" as const,
    letterSpacing: 1,
    textTransform: "uppercase" as const,
  },
  labelTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700" as const,
    letterSpacing: 2,
    textTransform: "uppercase" as const,
  },
  link: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400" as const,
  },
  stat: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "300" as const,
  },
  tiny: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "400" as const,
  },
  navLabel: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "500" as const,
  },
};

export type Theme = typeof Colors.light;
