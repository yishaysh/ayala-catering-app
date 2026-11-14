import React from 'react';
import { useStore } from '../store';

export const sanitizeHexColor = (value: unknown, fallback: string): string => {
  if (typeof value === 'string' && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value.trim())) {
    return value.trim();
  }
  return fallback;
};

export const ThemeStyles: React.FC = () => {
  const { theme } = useStore();
  if (!theme) return null;

  const styleContent = `
    :root {
      --theme-bg: ${sanitizeHexColor(theme.bg_color, '#fafaf9')};
      --theme-text: ${sanitizeHexColor(theme.text_color, '#1c1917')};
      --theme-primary: ${sanitizeHexColor(theme.primary_color, '#d4af37')};
      --theme-secondary: ${sanitizeHexColor(theme.secondary_color, '#b4941f')};
      --theme-header-bg: ${sanitizeHexColor(theme.header_bg_color, '#292524')};
      --theme-header-text: ${sanitizeHexColor(theme.header_text_color, '#ffffff')};
      --theme-hero-bg: ${sanitizeHexColor(theme.hero_bg_color, '#1c1917')};
      --theme-card-bg: ${sanitizeHexColor(theme.card_bg_color, '#ffffff')};
      --theme-card-text: ${sanitizeHexColor(theme.card_text_color, '#1c1917')};
    }
  `;

  return <style dangerouslySetInnerHTML={{ __html: styleContent }} />;
};
