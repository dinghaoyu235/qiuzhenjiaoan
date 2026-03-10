import React, { useState, useEffect } from 'react';
import { View, ScrollView, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { createStyles } from './styles';

type LessonPlan = {
  id: number;
  teacher_name: string;
  grade: string;
  subject: string;
  knowledge_point: string;
  course_objective: string;
  lesson_date: string;
  tiered_objectives: {
    basic: string;
    core: string;
    challenge: string;
  };
  intro_options: Array<{
    id: number;
    title: string;
    description: string;
    rationale: string;
  }>;
  activity_options: Array<{
    id: number;
    title: string;
    description: string;
    rationale: string;
  }>;
  summary_options: Array<{
    id: number;
    title: string;
    description: string;
    rationale: string;
  }>;
  learning_map: {
    basic: string;
    core: string;
    challenge: string;
  };
  full_plan: string;
  created_at: string;
};

type Params = {
  id: string;
};

export default function DetailScreen() {
  const router = useSafeRouter();
  const params = useSafeSearchParams<Params>();
  const { theme, isDark } = useTheme();
  const styles = createStyles(theme);

  const [loading, setLoading] = useState(true);
  const [lessonPlan, setLessonPlan] = useState<LessonPlan | null>(null);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    fetchLessonPlan();
  }, []);

  const fetchLessonPlan = async () => {
    try {
      setLoading(true);

      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/lesson-plans/${params.id}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch lesson plan');
      }

      setLessonPlan(result.data);
    } catch (err) {
      console.error('Error fetching lesson plan:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleShareToWechat = async () => {
    if (!lessonPlan) return;

    // Check if running on web
    if (Platform.OS === 'web') {
      alert('分享功能仅在移动端可用');
      return;
    }

    setSharing(true);
    try {
      const exportUrl = `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/lesson-plans/${lessonPlan.id}/export-word`;
      const fileName = `教案-${lessonPlan.subject}-${lessonPlan.knowledge_point}.docx`;

      // Download file to local
      const fileUri = `${(FileSystem as any).documentDirectory}${fileName}`;
      const downloadResult = await (FileSystem as any).downloadAsync(exportUrl, fileUri);

      if (downloadResult.status === 200) {
        // Use system sharing function, user can choose to share to WeChat
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          dialogTitle: '分享教案到微信',
        });
      } else {
        throw new Error('文件下载失败');
      }
    } catch (err) {
      console.error('Error sharing to wechat:', err);
      alert('分享失败');
    } finally {
      setSharing(false);
    }
  };

  if (loading) {
    return (
      <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </Screen>
    );
  }

  if (!lessonPlan) {
    return (
      <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
        <View style={styles.errorContainer}>
          <ThemedText variant="body" color={theme.textSecondary}>
            教案未找到
          </ThemedText>
        </View>
      </Screen>
    );
  }

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <ThemedView level="root" style={styles.header}>
          <ThemedText variant="h3" color={theme.textPrimary}>
            教案详情
          </ThemedText>
          <ThemedText variant="caption" color={theme.textMuted}>
            {lessonPlan.subject} - {lessonPlan.knowledge_point}
          </ThemedText>
        </ThemedView>

        {/* Basic Info */}
        <ThemedView level="default" style={styles.section}>
          <ThemedText variant="h4" color={theme.textPrimary} style={styles.sectionTitle}>
            基本信息
          </ThemedText>
          <View style={styles.infoRow}>
            <ThemedText variant="caption" color={theme.textMuted}>教师姓名</ThemedText>
            <ThemedText variant="body" color={theme.textPrimary}>{lessonPlan.teacher_name}</ThemedText>
          </View>
          <View style={styles.infoRow}>
            <ThemedText variant="caption" color={theme.textMuted}>年级</ThemedText>
            <ThemedText variant="body" color={theme.textPrimary}>{lessonPlan.grade}</ThemedText>
          </View>
          <View style={styles.infoRow}>
            <ThemedText variant="caption" color={theme.textMuted}>科目</ThemedText>
            <ThemedText variant="body" color={theme.textPrimary}>{lessonPlan.subject}</ThemedText>
          </View>
          <View style={styles.infoRow}>
            <ThemedText variant="caption" color={theme.textMuted}>知识点</ThemedText>
            <ThemedText variant="body" color={theme.textPrimary}>{lessonPlan.knowledge_point}</ThemedText>
          </View>
          <View style={styles.infoRow}>
            <ThemedText variant="caption" color={theme.textMuted}>课程目标</ThemedText>
            <ThemedText variant="body" color={theme.textPrimary}>{lessonPlan.course_objective}</ThemedText>
          </View>
          <View style={styles.infoRow}>
            <ThemedText variant="caption" color={theme.textMuted}>授课日期</ThemedText>
            <ThemedText variant="body" color={theme.textPrimary}>{lessonPlan.lesson_date}</ThemedText>
          </View>
          <View style={styles.infoRow}>
            <ThemedText variant="caption" color={theme.textMuted}>创建时间</ThemedText>
            <ThemedText variant="body" color={theme.textPrimary}>
              {new Date(lessonPlan.created_at).toLocaleString('zh-CN')}
            </ThemedText>
          </View>
        </ThemedView>

        {/* Tiered Objectives */}
        <ThemedView level="default" style={styles.section}>
          <ThemedText variant="h4" color={theme.textPrimary} style={styles.sectionTitle}>
            一、分层课程目标
          </ThemedText>
          <View style={styles.subSection}>
            <ThemedText variant="smallMedium" color={theme.textPrimary}>基础层目标</ThemedText>
            <ThemedText variant="body" color={theme.textSecondary}>{lessonPlan.tiered_objectives.basic}</ThemedText>
          </View>
          <View style={styles.subSection}>
            <ThemedText variant="smallMedium" color={theme.textPrimary}>核心层目标</ThemedText>
            <ThemedText variant="body" color={theme.textSecondary}>{lessonPlan.tiered_objectives.core}</ThemedText>
          </View>
          <View style={styles.subSection}>
            <ThemedText variant="smallMedium" color={theme.textPrimary}>挑战层目标</ThemedText>
            <ThemedText variant="body" color={theme.textSecondary}>{lessonPlan.tiered_objectives.challenge}</ThemedText>
          </View>
        </ThemedView>

        {/* Learning Map */}
        <ThemedView level="default" style={styles.section}>
          <ThemedText variant="h4" color={theme.textPrimary} style={styles.sectionTitle}>
            二、学习地图与过程性评估
          </ThemedText>
          <View style={styles.subSection}>
            <ThemedText variant="smallMedium" color={theme.textPrimary}>基础层路径</ThemedText>
            <ThemedText variant="body" color={theme.textSecondary}>{lessonPlan.learning_map.basic}</ThemedText>
          </View>
          <View style={styles.subSection}>
            <ThemedText variant="smallMedium" color={theme.textPrimary}>核心层路径</ThemedText>
            <ThemedText variant="body" color={theme.textSecondary}>{lessonPlan.learning_map.core}</ThemedText>
          </View>
          <View style={styles.subSection}>
            <ThemedText variant="smallMedium" color={theme.textPrimary}>挑战层路径</ThemedText>
            <ThemedText variant="body" color={theme.textSecondary}>{lessonPlan.learning_map.challenge}</ThemedText>
          </View>
        </ThemedView>

        {/* Full Plan */}
        <ThemedView level="default" style={styles.section}>
          <ThemedText variant="h4" color={theme.textPrimary} style={styles.sectionTitle}>
            完整教案
          </ThemedText>
          <ThemedText variant="body" color={theme.textSecondary}>
            {lessonPlan.full_plan}
          </ThemedText>
        </ThemedView>

        {/* Back Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.pptButton}
            onPress={() => router.push('/ppt-generation', { lessonPlanId: params.id })}
            activeOpacity={0.7}
          >
            <FontAwesome6 name="file-powerpoint" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <ThemedText variant="smallMedium" color="#FFFFFF">
              生成 PPT
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleShareToWechat}
            activeOpacity={0.7}
            disabled={sharing}
          >
            <ThemedText variant="smallMedium" color={theme.buttonPrimaryText}>
              {sharing ? '分享中...' : '分享到微信'}
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ThemedText variant="smallMedium" color={theme.textPrimary}>
              返回
            </ThemedText>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Screen>
  );
}
