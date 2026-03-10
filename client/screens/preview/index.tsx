import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from 'react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Audio } from 'expo-av';
import Markdown from 'react-native-markdown-display';
import RNSSE from 'react-native-sse';
import { FontAwesome6 } from '@expo/vector-icons';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import EducationQuoteCarousel from '@/components/EducationQuoteCarousel';
import { createStyles } from './styles';
import { Theme } from '@/constants/theme';

type Params = {
  teacherName: string;
  grade: string;
  subject: string;
  model?: string;
  knowledgePoint: string;
  courseObjective: string;
  lessonDate: string;
  tieredObjectives: string;
  selectedIntro: string;
  selectedActivity: string;
  selectedSummary: string;
  learningMap: string;
  adjustedSection?: string;
  adjustedContent?: string;
};

// Markdown styles helper
const getMarkdownStyles = (theme: Theme) => ({
  body: {
    color: theme.textPrimary,
    fontSize: 14,
    lineHeight: 22,
  },
  heading1: {
    color: theme.textPrimary,
    fontSize: 24,
    fontWeight: 'bold' as const,
    marginTop: 20,
    marginBottom: 10,
  },
  heading2: {
    color: theme.textPrimary,
    fontSize: 20,
    fontWeight: 'bold' as const,
    marginTop: 16,
    marginBottom: 8,
  },
  heading3: {
    color: theme.textPrimary,
    fontSize: 18,
    fontWeight: '600' as const,
    marginTop: 14,
    marginBottom: 6,
  },
  heading4: {
    color: theme.textPrimary,
    fontSize: 16,
    fontWeight: '600' as const,
    marginTop: 12,
    marginBottom: 6,
  },
  strong: {
    color: theme.textPrimary,
    fontWeight: 'bold' as const,
  },
  em: {
    fontStyle: 'italic' as const,
  },
  link: {
    color: theme.primary,
  },
  blockquote: {
    backgroundColor: theme.backgroundTertiary,
    padding: 10,
    borderLeftWidth: 4,
    borderLeftColor: theme.primary,
    marginVertical: 10,
  },
  code_inline: {
    backgroundColor: theme.backgroundTertiary,
    padding: 4,
    borderRadius: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  code_block: {
    backgroundColor: theme.backgroundTertiary,
    padding: 12,
    borderRadius: 8,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginVertical: 10,
  },
  fence: {
    backgroundColor: theme.backgroundTertiary,
    padding: 12,
    borderRadius: 8,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginVertical: 10,
  },
  hr: {
    backgroundColor: theme.border,
    height: 1,
    marginVertical: 15,
  },
  list_item: {
    marginBottom: 4,
  },
  bullet_list: {
    marginLeft: 20,
    marginBottom: 10,
  },
  ordered_list: {
    marginLeft: 20,
    marginBottom: 10,
  },
  table: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 4,
    marginVertical: 10,
  },
  th: {
    backgroundColor: theme.backgroundTertiary,
    fontWeight: 'bold' as const,
    padding: 8,
    borderRightWidth: 1,
    borderRightColor: theme.border,
  },
  td: {
    padding: 8,
    borderRightWidth: 1,
    borderRightColor: theme.border,
  },
});

export default function PreviewScreen() {
  const router = useSafeRouter();
  const params = useSafeSearchParams<Params>();
  const { theme, isDark } = useTheme();
  const styles = createStyles(theme);

  const tieredObjectives = JSON.parse(params.tieredObjectives || '{}');
  const selectedIntros = JSON.parse(params.selectedIntro || '[]');
  const selectedActivities = JSON.parse(params.selectedActivity || '[]');
  const selectedSummaries = JSON.parse(params.selectedSummary || '[]');
  const learningMap = JSON.parse(params.learningMap || '{}');

  // Preview loading state
  const [loading, setLoading] = useState(true);
  const [previewProgress, setPreviewProgress] = useState(0);
  const [previewMessage, setPreviewMessage] = useState('');
  const [fullPlan, setFullPlan] = useState('');
  const [expandedSections, setExpandedSections] = useState<{
    intro: string;
    activity: string;
    summary: string;
  }>({
    intro: '',
    activity: '',
    summary: '',
  });
  const [selectedOptions, setSelectedOptions] = useState<{
    intro: any[];
    activity: any[];
    summary: any[];
  }>({
    intro: selectedIntros,
    activity: selectedActivities,
    summary: selectedSummaries,
  });

  // Save state
  const [saving, setSaving] = useState(false);

  // Adjustment state
  const [adjustedOptions, setAdjustedOptions] = useState<{
    intros: any[];
    activities: any[];
    summaries: any[];
  }>({
    intros: selectedIntros,
    activities: selectedActivities,
    summaries: selectedSummaries,
  });

  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [editableLessonDate, setEditableLessonDate] = useState(params.lessonDate);

  // Ref to store SSE instance for cleanup
  const sseRef = useRef<RNSSE | null>(null);

  // Cleanup SSE on component unmount
  useEffect(() => {
    return () => {
      if (sseRef.current) {
        sseRef.current.close();
      }
    };
  }, []);

  // Load preview with SSE
  useEffect(() => {
    const loadPreview = async () => {
      try {
        setLoading(true);
        setPreviewProgress(0);
        setPreviewMessage('');

        const previewUrl = `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/lesson-plans/preview`;

        // Create SSE connection
        const sse = new RNSSE(previewUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            teacherName: params.teacherName,
            grade: params.grade,
            subject: params.subject,
            model: params.model,
            knowledgePoint: params.knowledgePoint,
            courseObjective: params.courseObjective,
            lessonDate: editableLessonDate,
            tieredObjectives,
            introOptions: selectedIntros,
            activityOptions: selectedActivities,
            summaryOptions: selectedSummaries,
            learningMap,
            selectedIntroIds: selectedIntros.map((o: any) => o.id),
            selectedActivityIds: selectedActivities.map((o: any) => o.id),
            selectedSummaryIds: selectedSummaries.map((o: any) => o.id),
          }),
        });

        // Store SSE instance for cleanup
        sseRef.current = sse;

        // Listen for progress messages
        sse.addEventListener('message', (event) => {
          if (!event.data || event.data === '[DONE]') {
            sse.close();
            return;
          }

          try {
            const data = JSON.parse(event.data);
            
            if (data.error) {
              console.error('Preview error:', data.error);
              setLoading(false);
              sse.close();
            } else {
              // Update progress
              setPreviewProgress(data.progress || 0);
              setPreviewMessage(data.message || '');
              
              // Check if preview is complete
              if (data.data && data.progress === 100) {
                setFullPlan(data.data);
                if (data.expandedSections) {
                  setExpandedSections(data.expandedSections);
                }
                if (data.selectedOptions) {
                  setSelectedOptions(data.selectedOptions);
                  setAdjustedOptions({
                    intros: data.selectedOptions.intro,
                    activities: data.selectedOptions.activity,
                    summaries: data.selectedOptions.summary,
                  });
                }
                setLoading(false);
              }
            }
          } catch (e) {
            console.error('Failed to parse SSE message:', e);
          }
        });

        // Handle connection errors
        sse.addEventListener('error', (error) => {
          console.error('SSE error:', error);
          setLoading(false);
          sse.close();
        });
      } catch (err) {
        console.error('Failed to load preview:', err);
        setLoading(false);
      }
    };

    loadPreview();
  }, []);

  // Listen for adjustment updates from adjustment page
  useEffect(() => {
    if (params.adjustedSection && params.adjustedContent) {
      // Update the corresponding section with adjusted content
      setExpandedSections((prev) => ({
        ...prev,
        [params.adjustedSection as string]: params.adjustedContent as string,
      }));

      // Rebuild full plan with updated section
      const selectedIntro = adjustedOptions.intros[0] || {};
      const selectedActivity = adjustedOptions.activities[0] || {};
      const selectedSummary = adjustedOptions.summaries[0] || {};
      
      const newFullPlan = `# ${params.subject}教案 - ${params.knowledgePoint}

## 基本信息

- 授课教师：${params.teacherName}
- 年级：${params.grade}
- 科目：${params.subject}
- 知识点：${params.knowledgePoint}
- 课程目标：${params.courseObjective}
- 授课日期：${editableLessonDate}

---

## 一、分层课程目标

### 基础层目标
${tieredObjectives.basic}

### 核心层目标
${tieredObjectives.core}

### 挑战层目标
${tieredObjectives.challenge}

---

## 二、导入阶段（5-10分钟）

${params.adjustedSection === 'intro' ? params.adjustedContent : expandedSections.intro}

---

## 三、课堂活动（40-45分钟）

${params.adjustedSection === 'activity' ? params.adjustedContent : expandedSections.activity}

---

## 四、总结阶段（10-15分钟）

${params.adjustedSection === 'summary' ? params.adjustedContent : expandedSections.summary}

---

## 五、学习地图与过程性评估

### 基础层路径
${learningMap.basic}

### 核心层路径
${learningMap.core}

### 挑战层路径
${learningMap.challenge}

---

**教案生成日期：${new Date().toLocaleString('zh-CN')}**
`;
      
      setFullPlan(newFullPlan);
    }
  }, [params.adjustedSection, params.adjustedContent]);

  // Listen for adjustment updates from AsyncStorage (for adjustment page)
  useFocusEffect(
    useCallback(() => {
      const checkAdjustedContent = async () => {
        try {
          const adjustedSection = await AsyncStorage.getItem('ADJUSTED_SECTION');
          const adjustedContent = await AsyncStorage.getItem('ADJUSTED_CONTENT');
          
          if (adjustedSection && adjustedContent) {
            // Update the corresponding section with adjusted content
            setExpandedSections((prev) => ({
              ...prev,
              [adjustedSection]: adjustedContent,
            }));
            
            // Clear storage
            await AsyncStorage.removeItem('ADJUSTED_SECTION');
            await AsyncStorage.removeItem('ADJUSTED_CONTENT');
            
            // Rebuild full plan with updated section
            const selectedIntro = adjustedOptions.intros[0] || {};
            const selectedActivity = adjustedOptions.activities[0] || {};
            const selectedSummary = adjustedOptions.summaries[0] || {};
            
            const newFullPlan = `# ${params.subject}教案 - ${params.knowledgePoint}

## 基本信息

- 授课教师：${params.teacherName}
- 年级：${params.grade}
- 科目：${params.subject}
- 知识点：${params.knowledgePoint}
- 课程目标：${params.courseObjective}
- 授课日期：${editableLessonDate}

---

## 一、分层课程目标

### 基础层目标
${tieredObjectives.basic}

### 核心层目标
${tieredObjectives.core}

### 挑战层目标
${tieredObjectives.challenge}

---

## 二、导入阶段（5-10分钟）

${adjustedSection === 'intro' ? adjustedContent : expandedSections.intro}

---

## 三、课堂活动（40-45分钟）

${adjustedSection === 'activity' ? adjustedContent : expandedSections.activity}

---

## 四、总结阶段（10-15分钟）

${adjustedSection === 'summary' ? adjustedContent : expandedSections.summary}

---

## 五、学习地图与过程性评估

### 基础层路径
${learningMap.basic}

### 核心层路径
${learningMap.core}

### 挑战层路径
${learningMap.challenge}

---

**教案生成日期：${new Date().toLocaleString('zh-CN')}**
`;
            
            setFullPlan(newFullPlan);
          }
        } catch (error) {
          console.error('Failed to check adjusted content:', error);
        }
      };
      
      checkAdjustedContent();
    }, [])
  );

  // Check audio permission status
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Audio.getPermissionsAsync();
        // Permission check for future use
        console.log('Audio permission status:', status);
      } catch (error) {
        console.error('Failed to check audio permission:', error);
      }
    })();
  }, []);

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (event.type === 'set' && selectedDate) {
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;
      setEditableLessonDate(formattedDate);
    }
    setShowDatePicker(false);
  };

  const handleSave = async () => {
    if (!fullPlan) {
      alert('教案内容未加载完成');
      return;
    }

    setSaving(true);
    try {
      // 重新构建完整的教案，确保包含所有调整后的内容
      const currentFullPlan = `# ${params.subject}教案 - ${params.knowledgePoint}

## 基本信息

- 授课教师：${params.teacherName}
- 年级：${params.grade}
- 科目：${params.subject}
- 知识点：${params.knowledgePoint}
- 课程目标：${params.courseObjective}
- 授课日期：${editableLessonDate}

---

## 一、分层课程目标

### 基础层目标
${tieredObjectives.basic}

### 核心层目标
${tieredObjectives.core}

### 挑战层目标
${tieredObjectives.challenge}

---

## 二、导入阶段（5-10分钟）

${expandedSections.intro || '暂无内容'}

---

## 三、课堂活动（40-45分钟）

${expandedSections.activity || '暂无内容'}

---

## 四、总结阶段（10-15分钟）

${expandedSections.summary || '暂无内容'}

---

## 五、学习地图与过程性评估

### 基础层路径
${learningMap.basic}

### 核心层路径
${learningMap.core}

### 挑战层路径
${learningMap.challenge}

---

**教案生成日期：${new Date().toLocaleString('zh-CN')}**
`;

      // First save to cloud to get an ID
      /**
       * 服务端文件：server/src/routes/lesson-plans.ts
       * 接口：POST /api/v1/lesson-plans/save
       * Body 参数：teacherName: string, grade: string, subject: string, knowledgePoint: string, courseObjective: string, lessonDate: string, fullPlan: string, tieredObjectives: object, introOptions: array, activityOptions: array, summaryOptions: array, learningMap: object, selectedIntroIds: number[], selectedActivityIds: number[], selectedSummaryIds: number[]
       */
      const saveResponse = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/lesson-plans/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teacherName: params.teacherName,
          grade: params.grade,
          subject: params.subject,
          knowledgePoint: params.knowledgePoint,
          courseObjective: params.courseObjective,
          lessonDate: editableLessonDate,
          fullPlan: currentFullPlan, // 使用重新构建的完整教案
          tieredObjectives,
          introOptions: adjustedOptions.intros,
          activityOptions: adjustedOptions.activities,
          summaryOptions: adjustedOptions.summaries,
          learningMap,
          selectedIntroIds: adjustedOptions.intros.map((o: any) => o.id),
          selectedActivityIds: adjustedOptions.activities.map((o: any) => o.id),
          selectedSummaryIds: adjustedOptions.summaries.map((o: any) => o.id),
        }),
      });

      const saveResult = await saveResponse.json();
      if (!saveResponse.ok) {
        throw new Error(saveResult.error || '保存失败');
      }

      // Export and share file (only on mobile platforms)
      if (Platform.OS !== 'web') {
        const exportUrl = `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/lesson-plans/${saveResult.data.id}/export-word`;
        const filename = `教案-${params.subject}-${params.knowledgePoint}.docx`;

        // Download file
        const downloadResult = await FileSystem.downloadAsync(
          exportUrl,
          (FileSystem as any).documentDirectory + filename
        );

        // Share the file
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(downloadResult.uri, {
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            dialogTitle: '分享教案',
          });
        } else {
          alert('设备不支持分享功能');
        }
      }

      // Navigate to history after successful save
      router.push('/history');
    } catch (error) {
      console.error('Error saving lesson plan:', error);
      alert(error instanceof Error ? error.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenAdjustment = (
    type: 'intro' | 'activity' | 'summary',
    index: number,
    data: any
  ) => {
    router.push('/adjustment', {
      type,
      index,
      data: JSON.stringify(data),
      teacherName: params.teacherName,
      grade: params.grade,
      subject: params.subject,
      knowledgePoint: params.knowledgePoint,
      courseObjective: params.courseObjective,
      lessonDate: editableLessonDate,
      tieredObjectives: JSON.stringify(tieredObjectives),
      introOptions: JSON.stringify(adjustedOptions.intros),
      activityOptions: JSON.stringify(adjustedOptions.activities),
      summaryOptions: JSON.stringify(adjustedOptions.summaries),
      learningMap: JSON.stringify(learningMap),
    });
  };

  const handleOpenSectionAdjustment = (type: 'intro' | 'activity' | 'summary') => {
    router.push('/adjustment', {
      type,
      index: 0,
      data: JSON.stringify({ title: type, description: '' }),
      expandedSections: JSON.stringify(expandedSections),
      teacherName: params.teacherName,
      grade: params.grade,
      subject: params.subject,
      knowledgePoint: params.knowledgePoint,
      courseObjective: params.courseObjective,
      lessonDate: editableLessonDate,
      tieredObjectives: JSON.stringify(tieredObjectives),
      introOptions: JSON.stringify(adjustedOptions.intros),
      activityOptions: JSON.stringify(adjustedOptions.activities),
      summaryOptions: JSON.stringify(adjustedOptions.summaries),
      learningMap: JSON.stringify(learningMap),
    });
  };


  // Loading state
  if (loading) {
    return (
      <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
        <View style={styles.loadingContainer}>
          {/* Education Quote Carousel - Top 2/3 */}
          <View style={styles.quoteCarouselWrapper}>
            <EducationQuoteCarousel interval={15000} />
          </View>

          {/* Progress Bar - Bottom 1/3 */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${previewProgress}%` }]} />
            </View>
            <ThemedText variant="smallMedium" color={theme.textPrimary} style={styles.progressText}>
              {previewProgress}%
            </ThemedText>
            <ThemedText variant="caption" color={theme.textMuted} style={styles.loadingMessage}>
              {previewMessage}
            </ThemedText>
          </View>
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
            教案预览
          </ThemedText>
          <ThemedText variant="caption" color={theme.textMuted}>
            {params.subject} - {params.knowledgePoint}
          </ThemedText>
        </ThemedView>

        {/* Basic Info */}
        <ThemedView level="default" style={styles.section}>
          <ThemedText variant="h4" color={theme.textPrimary} style={styles.sectionTitle}>
            基本信息
          </ThemedText>
          <View style={styles.infoRow}>
            <ThemedText variant="caption" color={theme.textMuted}>教师姓名</ThemedText>
            <ThemedText variant="body" color={theme.textPrimary}>{params.teacherName}</ThemedText>
          </View>
          <View style={styles.infoRow}>
            <ThemedText variant="caption" color={theme.textMuted}>年级</ThemedText>
            <ThemedText variant="body" color={theme.textPrimary}>{params.grade}</ThemedText>
          </View>
          <View style={styles.infoRow}>
            <ThemedText variant="caption" color={theme.textMuted}>科目</ThemedText>
            <ThemedText variant="body" color={theme.textPrimary}>{params.subject}</ThemedText>
          </View>
          <View style={styles.infoRow}>
            <ThemedText variant="caption" color={theme.textMuted}>知识点</ThemedText>
            <ThemedText variant="body" color={theme.textPrimary}>{params.knowledgePoint}</ThemedText>
          </View>
          <View style={styles.infoRow}>
            <ThemedText variant="caption" color={theme.textMuted}>课程目标</ThemedText>
            <ThemedText variant="body" color={theme.textPrimary}>{params.courseObjective}</ThemedText>
          </View>
          <TouchableOpacity
            style={styles.infoRow}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.7}
          >
            <ThemedText variant="caption" color={theme.textMuted}>授课日期</ThemedText>
            <View style={styles.dateValueContainer}>
              <ThemedText variant="body" color={theme.primary}>{editableLessonDate}</ThemedText>
              <FontAwesome6 name="calendar" size={16} color={theme.textMuted} style={styles.dateIcon} />
            </View>
          </TouchableOpacity>
        </ThemedView>

        {/* Tiered Objectives */}
        <ThemedView level="default" style={styles.section}>
          <ThemedText variant="h4" color={theme.textPrimary} style={styles.sectionTitle}>
            一、分层课程目标
          </ThemedText>
          <View style={styles.subSection}>
            <ThemedText variant="smallMedium" color={theme.textPrimary}>基础层目标</ThemedText>
            <ThemedText variant="body" color={theme.textSecondary}>{tieredObjectives.basic}</ThemedText>
          </View>
          <View style={styles.subSection}>
            <ThemedText variant="smallMedium" color={theme.textPrimary}>核心层目标</ThemedText>
            <ThemedText variant="body" color={theme.textSecondary}>{tieredObjectives.core}</ThemedText>
          </View>
          <View style={styles.subSection}>
            <ThemedText variant="smallMedium" color={theme.textPrimary}>挑战层目标</ThemedText>
            <ThemedText variant="body" color={theme.textSecondary}>{tieredObjectives.challenge}</ThemedText>
          </View>
        </ThemedView>

        {/* Intro */}
        <ThemedView level="default" style={styles.section}>
          <ThemedText variant="h4" color={theme.textPrimary} style={styles.sectionTitle}>
            二、导入阶段（5-10分钟）
          </ThemedText>
          {expandedSections.intro ? (
            <>
              <View style={styles.markdownContainer}>
                <Markdown style={getMarkdownStyles(theme)}>
                  {expandedSections.intro}
                </Markdown>
              </View>
              <TouchableOpacity
                style={styles.sectionAdjustButton}
                onPress={() => handleOpenSectionAdjustment('intro')}
                activeOpacity={0.7}
              >
                <FontAwesome6 name="pen-to-square" size={16} color={theme.primary} />
                <ThemedText variant="smallMedium" color={theme.primary} style={styles.sectionAdjustButtonText}>
                  AI个性化调整
                </ThemedText>
              </TouchableOpacity>
            </>
          ) : (
            adjustedOptions.intros.length === 0 ? (
              <ThemedText variant="body" color={theme.textMuted}>未选择导入环节</ThemedText>
            ) : (
              adjustedOptions.intros.map((item: any, index: number) => (
                <View key={item.id || index} style={styles.optionContainer}>
                  <View style={styles.optionHeader}>
                    <ThemedText variant="smallMedium" color={theme.textPrimary} style={styles.subTitle}>
                      选项{index + 1}：{item.title}
                    </ThemedText>
                    <TouchableOpacity
                      style={styles.adjustButton}
                      onPress={() => handleOpenAdjustment('intro', index, item)}
                      activeOpacity={0.7}
                    >
                      <FontAwesome6 name="pen-to-square" size={16} color={theme.primary} />
                      <ThemedText variant="caption" color={theme.primary} style={styles.adjustButtonText}>
                        个性化调整
                      </ThemedText>
                    </TouchableOpacity>
                  </View>
                  <ThemedText variant="body" color={theme.textSecondary}>{item.description}</ThemedText>
                  <ThemedText variant="caption" color={theme.textMuted} style={styles.rationale}>
                    设计理念：{item.rationale}
                  </ThemedText>
                </View>
              ))
            )
          )}
        </ThemedView>

        {/* Activity */}
        <ThemedView level="default" style={styles.section}>
          <ThemedText variant="h4" color={theme.textPrimary} style={styles.sectionTitle}>
            三、课堂活动（40-45分钟）
          </ThemedText>
          {expandedSections.activity ? (
            <>
              <View style={styles.markdownContainer}>
                <Markdown style={getMarkdownStyles(theme)}>
                  {expandedSections.activity}
                </Markdown>
              </View>
              <TouchableOpacity
                style={styles.sectionAdjustButton}
                onPress={() => handleOpenSectionAdjustment('activity')}
                activeOpacity={0.7}
              >
                <FontAwesome6 name="pen-to-square" size={16} color={theme.primary} />
                <ThemedText variant="smallMedium" color={theme.primary} style={styles.sectionAdjustButtonText}>
                  AI个性化调整
                </ThemedText>
              </TouchableOpacity>
            </>
          ) : (
            adjustedOptions.activities.length === 0 ? (
              <ThemedText variant="body" color={theme.textMuted}>未选择课堂活动</ThemedText>
            ) : (
              adjustedOptions.activities.map((item: any, index: number) => (
                <View key={item.id || index} style={styles.optionContainer}>
                  <View style={styles.optionHeader}>
                    <ThemedText variant="smallMedium" color={theme.textPrimary} style={styles.subTitle}>
                      选项{index + 1}：{item.title}
                    </ThemedText>
                    <TouchableOpacity
                      style={styles.adjustButton}
                      onPress={() => handleOpenAdjustment('activity', index, item)}
                      activeOpacity={0.7}
                    >
                      <FontAwesome6 name="pen-to-square" size={16} color={theme.primary} />
                      <ThemedText variant="caption" color={theme.primary} style={styles.adjustButtonText}>
                        个性化调整
                      </ThemedText>
                    </TouchableOpacity>
                  </View>
                  <ThemedText variant="body" color={theme.textSecondary}>{item.description}</ThemedText>
                  <ThemedText variant="caption" color={theme.textMuted} style={styles.rationale}>
                    设计理念：{item.rationale}
                  </ThemedText>
                </View>
              ))
            )
          )}
        </ThemedView>

        {/* Summary */}
        <ThemedView level="default" style={styles.section}>
          <ThemedText variant="h4" color={theme.textPrimary} style={styles.sectionTitle}>
            四、总结阶段（10-15分钟）
          </ThemedText>
          {expandedSections.summary ? (
            <>
              <View style={styles.markdownContainer}>
                <Markdown style={getMarkdownStyles(theme)}>
                  {expandedSections.summary}
                </Markdown>
              </View>
              <TouchableOpacity
                style={styles.sectionAdjustButton}
                onPress={() => handleOpenSectionAdjustment('summary')}
                activeOpacity={0.7}
              >
                <FontAwesome6 name="pen-to-square" size={16} color={theme.primary} />
                <ThemedText variant="smallMedium" color={theme.primary} style={styles.sectionAdjustButtonText}>
                  AI个性化调整
                </ThemedText>
              </TouchableOpacity>
            </>
          ) : (
            adjustedOptions.summaries.length === 0 ? (
              <ThemedText variant="body" color={theme.textMuted}>未选择总结阶段</ThemedText>
            ) : (
              adjustedOptions.summaries.map((item: any, index: number) => (
                <View key={item.id || index} style={styles.optionContainer}>
                  <View style={styles.optionHeader}>
                    <ThemedText variant="smallMedium" color={theme.textPrimary} style={styles.subTitle}>
                      选项{index + 1}：{item.title}
                    </ThemedText>
                    <TouchableOpacity
                      style={styles.adjustButton}
                      onPress={() => handleOpenAdjustment('summary', index, item)}
                      activeOpacity={0.7}
                    >
                      <FontAwesome6 name="pen-to-square" size={16} color={theme.primary} />
                      <ThemedText variant="caption" color={theme.primary} style={styles.adjustButtonText}>
                        个性化调整
                      </ThemedText>
                    </TouchableOpacity>
                  </View>
                  <ThemedText variant="body" color={theme.textSecondary}>{item.description}</ThemedText>
                  <ThemedText variant="caption" color={theme.textMuted} style={styles.rationale}>
                    设计理念：{item.rationale}
                  </ThemedText>
                </View>
              ))
            )
          )}
        </ThemedView>

        {/* Learning Map */}
        <ThemedView level="default" style={styles.section}>
          <ThemedText variant="h4" color={theme.textPrimary} style={styles.sectionTitle}>
            五、学习地图与过程性评估
          </ThemedText>
          <View style={styles.subSection}>
            <ThemedText variant="smallMedium" color={theme.textPrimary}>基础层路径</ThemedText>
            <ThemedText variant="body" color={theme.textSecondary}>{learningMap.basic}</ThemedText>
          </View>
          <View style={styles.subSection}>
            <ThemedText variant="smallMedium" color={theme.textPrimary}>核心层路径</ThemedText>
            <ThemedText variant="body" color={theme.textSecondary}>{learningMap.core}</ThemedText>
          </View>
          <View style={styles.subSection}>
            <ThemedText variant="smallMedium" color={theme.textPrimary}>挑战层路径</ThemedText>
            <ThemedText variant="body" color={theme.textSecondary}>{learningMap.challenge}</ThemedText>
          </View>
        </ThemedView>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.backButton]}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ThemedText variant="smallMedium" color={theme.textPrimary}>
              返回修改
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.saveButton]}
            onPress={saving ? undefined : handleSave}
            activeOpacity={0.7}
          >
            <ThemedText variant="smallMedium" color={theme.buttonPrimaryText}>
              {saving ? '保存中...' : '保存教案'}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {showDatePicker && (
        <DateTimePicker
          value={editableLessonDate ? new Date(editableLessonDate) : new Date()}
          mode="date"
          display="default"
          onChange={handleDateChange}
          accentColor="#1678D1"
          // @ts-ignore - androidVariant is supported but not in type definition
          androidVariant="iosClone"
          themeVariant={isDark ? 'dark' : 'light'}
        />
      )}
    </Screen>
  );
}
