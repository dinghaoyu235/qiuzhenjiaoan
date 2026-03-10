import { StyleSheet, Dimensions } from 'react-native';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SLIDE_WIDTH = SCREEN_WIDTH - Spacing.lg * 2;
const SLIDE_HEIGHT = SLIDE_WIDTH * (9 / 16);
const THUMBNAIL_WIDTH = 120;
const THUMBNAIL_HEIGHT = THUMBNAIL_WIDTH * (9 / 16);

export const createStyles = (theme: Theme) => {
  return StyleSheet.create({
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: Spacing.md,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.xl,
      paddingBottom: Spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: BorderRadius.lg,
      backgroundColor: theme.backgroundTertiary,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.borderLight,
    },
    headerCenter: {
      flex: 1,
      alignItems: 'center',
      marginLeft: Spacing.sm,
    },
    headerRight: {
      flexDirection: 'row',
      gap: Spacing.md,
    },
    exportIcon: {
      width: 40,
      height: 40,
      borderRadius: BorderRadius.lg,
      backgroundColor: theme.backgroundTertiary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    mainContent: {
      flex: 1,
      gap: Spacing.lg,
    },
    slidePreviewContainer: {
      alignItems: 'center',
      paddingTop: Spacing.xl,
    },
    slideCard: {
      width: SLIDE_WIDTH,
      height: SLIDE_HEIGHT,
      borderRadius: BorderRadius.lg,
      borderWidth: 2,
      overflow: 'hidden',
      marginBottom: Spacing.lg,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    slideContent: {
      flex: 1,
      padding: Spacing.lg,
      justifyContent: 'space-between',
    },
    slideImage: {
      width: '100%',
      height: '100%',
      borderRadius: BorderRadius.md,
    },
    slideTitle: {
      fontSize: 24,
      fontWeight: '700' as const,
      marginBottom: Spacing.md,
      textAlign: 'center',
    },
    slideBody: {
      flex: 1,
      gap: Spacing.md,
    },
    bulletItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Spacing.sm,
    },
    bulletPoint: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginTop: 8,
    },
    emphasis: {
      fontWeight: '700' as const,
      color: theme.primary,
    },
    imagePlaceholder: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.backgroundTertiary,
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
      minHeight: 150,
    },
    imagePlaceholderText: {
      marginTop: Spacing.sm,
    },
    questionBox: {
      backgroundColor: theme.backgroundTertiary,
      padding: Spacing.md,
      borderRadius: BorderRadius.lg,
      borderLeftWidth: 4,
      borderLeftColor: theme.primary,
    },
    slideFooter: {
      alignItems: 'flex-end',
      paddingTop: Spacing.sm,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    navigationControls: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.xl,
      paddingHorizontal: Spacing.lg,
    },
    navButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.backgroundTertiary,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.border,
    },
    navButtonDisabled: {
      opacity: 0.5,
    },
    thumbnailsContainer: {
      paddingHorizontal: Spacing.lg,
      paddingBottom: Spacing.xl,
    },
    thumbnailsTitle: {
      marginBottom: Spacing.sm,
      fontWeight: '600' as const,
    },
    thumbnailsScrollWrapper: {
      height: THUMBNAIL_HEIGHT,
    },
    thumbnailsScroll: {
      gap: Spacing.md,
    },
    thumbnail: {
      width: THUMBNAIL_WIDTH,
      height: THUMBNAIL_HEIGHT,
      borderRadius: BorderRadius.md,
      borderWidth: 2,
      overflow: 'hidden',
    },
    thumbnailActive: {
      borderWidth: 3,
    },
    thumbnailInner: {
      flex: 1,
      padding: Spacing.sm,
      justifyContent: 'center',
      alignItems: 'center',
    },
    thumbnailNumber: {
      fontSize: 20,
      fontWeight: '700' as const,
      marginBottom: Spacing.xs,
    },
    thumbnailTitle: {
      fontSize: 10,
      textAlign: 'center',
      lineHeight: 12,
    },
  });
};
