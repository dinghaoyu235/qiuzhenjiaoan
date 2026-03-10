import { StyleSheet } from 'react-native';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';

export const createStyles = (theme: Theme) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.backgroundRoot,
      position: 'relative',
    },
    backgroundDecoration: {
      position: 'absolute',
      top: -200,
      right: -200,
      width: 600,
      height: 600,
      borderRadius: 300,
      backgroundColor: theme.primary,
      opacity: 0.05,
    },
    logoSection: {
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: Spacing['5xl'],
      marginBottom: Spacing['4xl'],
    },
    logoIcon: {
      width: 80,
      height: 80,
      borderRadius: BorderRadius.xl,
      backgroundColor: theme.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: Spacing.lg,
      boxShadow: '0px 8px 24px rgba(22, 120, 209, 0.3)',
    },
    appTitle: {
      fontSize: 36,
      fontWeight: '700',
      marginBottom: Spacing.sm,
      textAlign: 'center',
    },
    appSubtitle: {
      fontSize: 16,
      textAlign: 'center',
    },
    buttonSection: {
      paddingHorizontal: Spacing.xl,
      gap: Spacing.lg,
    },
    actionButton: {
      backgroundColor: theme.primary,
      borderRadius: BorderRadius.xl,
      padding: Spacing.xl,
      flexDirection: 'row',
      alignItems: 'center',
      boxShadow: '0px 8px 24px rgba(22, 120, 209, 0.25)',
      borderWidth: 2,
      borderColor: theme.primary,
    },
    pptButton: {
      backgroundColor: '#FF6B35',
      borderColor: '#FF6B35',
      boxShadow: '0px 8px 24px rgba(255, 107, 53, 0.25)',
    },
    buttonIconWrapper: {
      width: 64,
      height: 64,
      borderRadius: BorderRadius.lg,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: Spacing.lg,
    },
    buttonContent: {
      flex: 1,
    },
    buttonTitle: {
      fontSize: 20,
      fontWeight: '600',
      marginBottom: Spacing.xs,
    },
    buttonDescription: {
      fontSize: 14,
      opacity: 0.9,
    },
    buttonArrow: {
      marginLeft: Spacing.md,
    },
    footer: {
      alignItems: 'center',
      paddingBottom: Spacing['5xl'],
      marginTop: 'auto',
      paddingHorizontal: Spacing.xl,
    },
  });
};
