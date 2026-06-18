import React from 'react';
import { useStore } from '../store';

export const ThemeStyles: React.FC = () => {
  const { theme } = useStore();

  if (!theme) return null;

  const styleContent = `
    :root {
      --theme-bg: ${theme.bg_color};
      --theme-text: ${theme.text_color};
      --theme-primary: ${theme.primary_color};
      --theme-secondary: ${theme.secondary_color};
      --theme-header-bg: ${theme.header_bg_color};
      --theme-header-text: ${theme.header_text_color};
      --theme-hero-bg: ${theme.hero_bg_color};
      --theme-card-bg: ${theme.card_bg_color};
      --theme-card-text: ${theme.card_text_color};
    }
  `;

  return <style dangerouslySetInnerHTML={{ __html: styleContent }} />;
};
