import React from 'react';
import { View, StyleSheet, ImageBackground } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { createStyles } from './styles';

/**
 * 应用首页 - 功能选择
 * 
 * 用户可以选择进入教案生成或PPT生成功能
 */
export default function HomeSelectionScreen() {
  const router = useSafeRouter();
  const { theme, isDark } = useTheme();
  const styles = createStyles(theme);

  const handleLessonPlanPress = () => {
    router.push('/lesson-plan');
  };

  const handlePPTPress = () => {
    router.push('/ppt-generation');
  };

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <View style={styles.container}>
        {/* 背景装饰 */}
        <View style={styles.backgroundDecoration} />
        
        {/* Logo区域 */}
        <View style={styles.logoSection}>
          <View style={styles.logoIcon}>
            <FontAwesome6 name="book-open" size={48} color="#FFFFFF" />
          </View>
          <ThemedText variant="h1" color={theme.textPrimary} style={styles.appTitle}>
            求真学社
          </ThemedText>
          <ThemedText variant="body" color={theme.textSecondary} style={styles.appSubtitle}>
            智能教学工具平台
          </ThemedText>
        </View>

        {/* 功能按钮区域 */}
        <View style={styles.buttonSection}>
          {/* 教案生成按钮 */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleLessonPlanPress}
            activeOpacity={0.7}
          >
            <View style={styles.buttonIconWrapper}>
              <FontAwesome6 name="chalkboard-user" size={40} color="#FFFFFF" />
            </View>
            <View style={styles.buttonContent}>
              <ThemedText variant="h3" color="#FFFFFF" style={styles.buttonTitle}>
                教案生成
              </ThemedText>
              <ThemedText variant="caption" color="#FFFFFF" style={styles.buttonDescription}>
                AI智能生成教案，支持个性化调整
              </ThemedText>
            </View>
            <FontAwesome6 name="chevron-right" size={20} color="#FFFFFF" style={styles.buttonArrow} />
          </TouchableOpacity>

          {/* PPT生成按钮 */}
          <TouchableOpacity
            style={[styles.actionButton, styles.pptButton]}
            onPress={handlePPTPress}
            activeOpacity={0.7}
          >
            <View style={styles.buttonIconWrapper}>
              <FontAwesome6 name="file-powerpoint" size={40} color="#FFFFFF" />
            </View>
            <View style={styles.buttonContent}>
              <ThemedText variant="h3" color="#FFFFFF" style={styles.buttonTitle}>
                PPT生成
              </ThemedText>
              <ThemedText variant="caption" color="#FFFFFF" style={styles.buttonDescription}>
                一键生成演示文稿，智能排版
              </ThemedText>
            </View>
            <FontAwesome6 name="chevron-right" size={20} color="#FFFFFF" style={styles.buttonArrow} />
          </TouchableOpacity>
        </View>

        {/* 底部信息 */}
        <View style={styles.footer}>
          <ThemedText variant="caption" color={theme.textMuted}>
            用科技赋能教育，让教学更高效
          </ThemedText>
        </View>
      </View>
    </Screen>
  );
}

// 临时导入，实际应该从 'react-native' 导入
import { TouchableOpacity } from 'react-native';
