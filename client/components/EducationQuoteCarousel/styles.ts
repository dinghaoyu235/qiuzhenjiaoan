import { StyleSheet, Dimensions } from 'react-native';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';

export const createStyles = (theme: Theme) => {
  const SCREEN_WIDTH = Dimensions.get('window').width;
  
  return StyleSheet.create({
    container: {
      width: '100%',
      height: '100%',
      position: 'relative',
    },
    slide: {
      width: SCREEN_WIDTH,
      height: '100%',
      justifyContent: 'center',
      paddingHorizontal: Spacing.xl,
      paddingVertical: Spacing.xl,
    },
    quoteCard: {
      width: '100%',
      backgroundColor: theme.backgroundRoot,
      borderWidth: 2,
      borderColor: theme.primary,
      borderRadius: BorderRadius.xl,
      padding: Spacing.xl,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 4,
    },
    theoryTag: {
      alignSelf: 'flex-start',
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.sm,
      backgroundColor: 'rgba(22, 120, 209, 0.08)',
      marginBottom: Spacing.md,
    },
    theoryText: {
      color: theme.primary,
      fontSize: 13,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    cardBody: {
      gap: Spacing.lg,
    },
    quoteText: {
      color: theme.textPrimary,
      fontSize: 16,
      lineHeight: 28,
      fontWeight: '500',
      fontStyle: 'italic',
    },
    caseStudyBox: {
      backgroundColor: 'rgba(22, 120, 209, 0.05)',
      borderRadius: BorderRadius.md,
      padding: Spacing.md,
      borderLeftWidth: 3,
      borderLeftColor: theme.primary,
    },
    caseStudyLabel: {
      color: theme.primary,
      fontSize: 11,
      fontWeight: '700',
      marginBottom: Spacing.xs,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    caseStudyText: {
      color: theme.textSecondary,
      fontSize: 14,
      lineHeight: 22,
    },
    saveButton: {
      position: 'absolute',
      top: Spacing.md,
      right: Spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      backgroundColor: theme.primary,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.lg,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 4,
      zIndex: 10,
    },
    saveButtonText: {
      color: '#fff',
      fontSize: 13,
      fontWeight: '600',
    },
  });
};
