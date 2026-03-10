import { StyleSheet } from 'react-native';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';

export const createStyles = (theme: Theme) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.backgroundRoot,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.lg,
      paddingBottom: Spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    scrollContent: {
      flex: 1,
    },
    scrollContentContainer: {
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.lg,
      paddingBottom: Spacing['2xl'],
    },
    sectionTitle: {
      marginBottom: Spacing.md,
      color: theme.textPrimary,
    },
    currentOptionCard: {
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
      marginBottom: Spacing.xl,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    adjustedContentCard: {
      backgroundColor: 'rgba(79, 70, 229, 0.05)',
      borderColor: theme.primary,
      borderWidth: 2,
    },
    markdownContainer: {
      overflow: 'hidden',
    },
    loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing.xl,
      gap: Spacing.md,
    },
    loadingText: {
      color: theme.textMuted,
    },
    currentOptionDesc: {
      marginTop: Spacing.sm,
      lineHeight: 24,
      color: theme.textSecondary,
    },
    principleText: {
      marginTop: Spacing.sm,
      fontStyle: 'italic',
      color: theme.textMuted,
    },
    inputContainer: {
      backgroundColor: theme.backgroundDefault,
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
      marginBottom: Spacing.md,
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    adjustmentInput: {
      minHeight: 120,
      fontSize: 16,
      color: theme.textPrimary,
      marginBottom: Spacing.md,
    },
    voiceButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.md,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.lg,
      gap: Spacing.sm,
    },
    voiceButtonRecording: {
      backgroundColor: theme.primary,
    },
    voiceButtonRecognizing: {
      backgroundColor: theme.backgroundTertiary,
      opacity: 0.6,
    },
    voiceButtonText: {
      fontWeight: '600',
    },
    hint: {
      marginTop: Spacing.md,
      marginBottom: Spacing.xl,
      lineHeight: 20,
    },
    footer: {
      flexDirection: 'row',
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.lg,
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
      backgroundColor: theme.backgroundRoot,
      gap: Spacing.md,
    },
    footerButton: {
      flex: 1,
      paddingVertical: Spacing.lg,
      borderRadius: BorderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 48,
    },
    confirmButton: {
      backgroundColor: theme.primary,
    },
    saveButton: {
      backgroundColor: theme.primary,
    },
    disabledButton: {
      backgroundColor: theme.backgroundTertiary,
      opacity: 0.5,
    },
  });
};
