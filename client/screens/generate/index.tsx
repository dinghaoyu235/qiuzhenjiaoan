import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import RNSSE from 'react-native-sse';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import EducationQuoteCarousel from '@/components/EducationQuoteCarousel';
import { createStyles } from './styles';

type Option = {
  id: number;
  title: string;
  description: string;
  rationale: string;
};

type GeneratedContent = {
  tieredObjectives: {
    basic: string;
    core: string;
    challenge: string;
  };
  introOptions: Option[];
  activityOptions: Option[];
  summaryOptions: Option[];
  learningMap: {
    basic: string;
    core: string;
    challenge: string;
  };
};

type Params = {
  teacherName: string;
  grade: string;
  subject: string;
  model?: string;
  knowledgePoint: string;
  courseObjective: string;
  lessonDate: string;
  supplementaryMaterial?: string;
  supplementaryImageUri?: string;
  supplementaryFile?: { name: string; uri: string; content?: string };
};

export default function GenerateScreen() {
  const router = useSafeRouter();
  const params = useSafeSearchParams<Params>();
  const { theme, isDark } = useTheme();
  const styles = createStyles(theme);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  
  // Generation progress (real-time from SSE)
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStep, setGenerationStep] = useState('');

  const [selectedIntroId, setSelectedIntroId] = useState<number | null>(null);
  const [selectedActivityId, setSelectedActivityId] = useState<number | null>(null);
  const [selectedSummaryId, setSelectedSummaryId] = useState<number | null>(null);

  // Multi-select support
  const [selectedIntroIds, setSelectedIntroIds] = useState<number[]>([]);
  const [selectedActivityIds, setSelectedActivityIds] = useState<number[]>([]);
  const [selectedSummaryIds, setSelectedSummaryIds] = useState<number[]>([]);

  // Regenerating state
  const [regeneratingType, setRegeneratingType] = useState<'intro' | 'activity' | 'summary' | null>(null);

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

  const generateLessonPlan = async () => {
    try {
      setLoading(true);
      setError(null);
      setGenerationProgress(0);
      setGenerationStep('');

      const sseUrl = `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/lesson-plans/generate`;
      
      // Create SSE connection
      const sse = new RNSSE(sseUrl, {
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
          lessonDate: params.lessonDate,
          supplementaryMaterial: params.supplementaryMaterial?.trim() || undefined,
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
            setError(data.error || '生成失败');
            setLoading(false);
            sse.close();
          } else {
            // Update progress
            setGenerationProgress(data.progress || 0);
            setGenerationStep(data.message || '');
            
            // Check if generation is complete
            if (data.data && data.progress === 100) {
              setGeneratedContent(data.data);
              
              // Auto-select first option from each category
              if (data.data.introOptions?.[0]) {
                setSelectedIntroId(data.data.introOptions[0].id);
                setSelectedIntroIds([data.data.introOptions[0].id]);
              }
              if (data.data.activityOptions?.[0]) {
                setSelectedActivityId(data.data.activityOptions[0].id);
                setSelectedActivityIds([data.data.activityOptions[0].id]);
              }
              if (data.data.summaryOptions?.[0]) {
                setSelectedSummaryId(data.data.summaryOptions[0].id);
                setSelectedSummaryIds([data.data.summaryOptions[0].id]);
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
        setError('生成连接失败');
        setLoading(false);
        sse.close();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
    }
  };

  useEffect(() => {
    generateLessonPlan();
  }, []);

  const handleRegenerateOptions = async (type: 'intro' | 'activity' | 'summary') => {
    try {
      setRegeneratingType(type);

      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/lesson-plans/regenerate-options`, {
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
          lessonDate: params.lessonDate,
          type,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to regenerate options');
      }

      // Update options based on type
      setGeneratedContent(prev => {
        if (!prev) return prev;

        const newContent = { ...prev };
        if (type === 'intro') {
          newContent.introOptions = result.data.options;
          setSelectedIntroIds([]);
          setSelectedIntroId(null);
        } else if (type === 'activity') {
          newContent.activityOptions = result.data.options;
          setSelectedActivityIds([]);
          setSelectedActivityId(null);
        } else if (type === 'summary') {
          newContent.summaryOptions = result.data.options;
          setSelectedSummaryIds([]);
          setSelectedSummaryId(null);
        }

        return newContent;
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : '重新生成失败');
    } finally {
      setRegeneratingType(null);
    }
  };

  const handleToggleOption = (type: 'intro' | 'activity' | 'summary', optionId: number) => {
    let selectedIds: number[];
    let setSelected: React.Dispatch<React.SetStateAction<number[]>>;
    let setSingle: React.Dispatch<React.SetStateAction<number | null>>;

    if (type === 'intro') {
      selectedIds = selectedIntroIds;
      setSelected = setSelectedIntroIds;
      setSingle = setSelectedIntroId;
    } else if (type === 'activity') {
      selectedIds = selectedActivityIds;
      setSelected = setSelectedActivityIds;
      setSingle = setSelectedActivityId;
    } else {
      selectedIds = selectedSummaryIds;
      setSelected = setSelectedSummaryIds;
      setSingle = setSelectedSummaryId;
    }

    if (selectedIds.includes(optionId)) {
      // Deselect
      setSelected(selectedIds.filter(id => id !== optionId));
      if (selectedIds.filter(id => id !== optionId).length === 0) {
        setSingle(null);
      }
    } else {
      // Select (max 2)
      if (selectedIds.length < 2) {
        setSelected([...selectedIds, optionId]);
        setSingle(optionId);
      } else {
        alert('最多只能选择2个选项');
      }
    }
  };

  const handlePreview = () => {
    if (!generatedContent) return;
    if (selectedIntroIds.length === 0 || selectedActivityIds.length === 0 || selectedSummaryIds.length === 0) {
      alert('请从每个部分选择1-2个选项');
      return;
    }

    const selectedIntro = generatedContent.introOptions.filter(o => selectedIntroIds.includes(o.id));
    const selectedActivity = generatedContent.activityOptions.filter(o => selectedActivityIds.includes(o.id));
    const selectedSummary = generatedContent.summaryOptions.filter(o => selectedSummaryIds.includes(o.id));

    router.push('/preview', {
      teacherName: params.teacherName,
      grade: params.grade,
      subject: params.subject,
      knowledgePoint: params.knowledgePoint,
      courseObjective: params.courseObjective,
      lessonDate: params.lessonDate,
      tieredObjectives: JSON.stringify(generatedContent.tieredObjectives),
      selectedIntro: JSON.stringify(selectedIntro),
      selectedActivity: JSON.stringify(selectedActivity),
      selectedSummary: JSON.stringify(selectedSummary),
      learningMap: JSON.stringify(generatedContent.learningMap),
    });
  };

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
              <View style={[styles.progressFill, { width: `${generationProgress}%` }]} />
            </View>
            <ThemedText variant="smallMedium" color={theme.textPrimary} style={styles.progressText}>
              {generationProgress}%
            </ThemedText>
            <ThemedText variant="caption" color={theme.textMuted} style={styles.progressMessage}>
              {generationStep}
            </ThemedText>
          </View>
        </View>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
        <View style={styles.errorContainer}>
          <ThemedText variant="h3" color={theme.textPrimary}>
            生成失败
          </ThemedText>
          <ThemedText variant="body" color={theme.textSecondary}>
            {error}
          </ThemedText>
        </View>
      </Screen>
    );
  }

  if (!generatedContent) {
    return null;
  }

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <ThemedView level="root" style={styles.header}>
          <ThemedText variant="h3" color={theme.textPrimary}>
            选择教案选项
          </ThemedText>
          <ThemedText variant="caption" color={theme.textMuted}>
            请从每个部分选择一个选项
          </ThemedText>
        </ThemedView>

        {/* Tiered Objectives */}
        <ThemedView level="default" style={styles.section}>
          <ThemedText variant="h4" color={theme.textPrimary} style={styles.sectionTitle}>
            分层课程目标
          </ThemedText>
          <View style={styles.objectiveContainer}>
            <View style={styles.objectiveCard}>
              <ThemedText variant="smallMedium" color={theme.textPrimary} style={styles.objectiveLabel}>
                基础层
              </ThemedText>
              <ThemedText variant="caption" color={theme.textSecondary}>
                {generatedContent.tieredObjectives.basic}
              </ThemedText>
            </View>
            <View style={styles.objectiveCard}>
              <ThemedText variant="smallMedium" color={theme.textPrimary} style={styles.objectiveLabel}>
                核心层
              </ThemedText>
              <ThemedText variant="caption" color={theme.textSecondary}>
                {generatedContent.tieredObjectives.core}
              </ThemedText>
            </View>
            <View style={styles.objectiveCard}>
              <ThemedText variant="smallMedium" color={theme.textPrimary} style={styles.objectiveLabel}>
                挑战层
              </ThemedText>
              <ThemedText variant="caption" color={theme.textSecondary}>
                {generatedContent.tieredObjectives.challenge}
              </ThemedText>
            </View>
          </View>
        </ThemedView>

        {/* Intro Options */}
        <ThemedView level="default" style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText variant="h4" color={theme.textPrimary} style={styles.sectionTitle}>
              导入阶段（5-10分钟）
            </ThemedText>
            <TouchableOpacity
              style={styles.regenerateButton}
              onPress={() => handleRegenerateOptions('intro')}
              disabled={regeneratingType === 'intro'}
              activeOpacity={0.7}
            >
              <ThemedText variant="caption" color={regeneratingType === 'intro' ? theme.textMuted : theme.primary}>
                {regeneratingType === 'intro' ? '生成中...' : '重新生成'}
              </ThemedText>
            </TouchableOpacity>
          </View>
          {generatedContent.introOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.optionCard,
                selectedIntroIds.includes(option.id) && styles.optionCardSelected,
                selectedIntroIds.includes(option.id) && { borderColor: theme.primary }
              ]}
              onPress={() => handleToggleOption('intro', option.id)}
              activeOpacity={0.7}
            >
              <View style={styles.optionHeader}>
                <ThemedText variant="smallMedium" color={theme.textPrimary} style={styles.optionTitle}>
                  {option.title}
                </ThemedText>
                {selectedIntroIds.includes(option.id) && (
                  <View style={[styles.checkBadge, { backgroundColor: theme.primary }]}>
                    <ThemedText variant="caption" color={theme.buttonPrimaryText}>
                      {selectedIntroIds.indexOf(option.id) + 1}
                    </ThemedText>
                  </View>
                )}
              </View>
              <ThemedText variant="caption" color={theme.textSecondary} style={styles.optionDescription}>
                {option.description}
              </ThemedText>
              <ThemedText variant="caption" color={theme.textMuted} style={styles.optionRationale}>
                {option.rationale}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </ThemedView>

        {/* Activity Options */}
        <ThemedView level="default" style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText variant="h4" color={theme.textPrimary} style={styles.sectionTitle}>
              课堂活动（40-45分钟）
            </ThemedText>
            <TouchableOpacity
              style={styles.regenerateButton}
              onPress={() => handleRegenerateOptions('activity')}
              disabled={regeneratingType === 'activity'}
              activeOpacity={0.7}
            >
              <ThemedText variant="caption" color={regeneratingType === 'activity' ? theme.textMuted : theme.primary}>
                {regeneratingType === 'activity' ? '生成中...' : '重新生成'}
              </ThemedText>
            </TouchableOpacity>
          </View>
          {generatedContent.activityOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.optionCard,
                selectedActivityIds.includes(option.id) && styles.optionCardSelected,
                selectedActivityIds.includes(option.id) && { borderColor: theme.primary }
              ]}
              onPress={() => handleToggleOption('activity', option.id)}
              activeOpacity={0.7}
            >
              <View style={styles.optionHeader}>
                <ThemedText variant="smallMedium" color={theme.textPrimary} style={styles.optionTitle}>
                  {option.title}
                </ThemedText>
                {selectedActivityIds.includes(option.id) && (
                  <View style={[styles.checkBadge, { backgroundColor: theme.primary }]}>
                    <ThemedText variant="caption" color={theme.buttonPrimaryText}>
                      {selectedActivityIds.indexOf(option.id) + 1}
                    </ThemedText>
                  </View>
                )}
              </View>
              <ThemedText variant="caption" color={theme.textSecondary} style={styles.optionDescription}>
                {option.description}
              </ThemedText>
              <ThemedText variant="caption" color={theme.textMuted} style={styles.optionRationale}>
                {option.rationale}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </ThemedView>

        {/* Summary Options */}
        <ThemedView level="default" style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText variant="h4" color={theme.textPrimary} style={styles.sectionTitle}>
              总结阶段（10-15分钟）
            </ThemedText>
            <TouchableOpacity
              style={styles.regenerateButton}
              onPress={() => handleRegenerateOptions('summary')}
              disabled={regeneratingType === 'summary'}
              activeOpacity={0.7}
            >
              <ThemedText variant="caption" color={regeneratingType === 'summary' ? theme.textMuted : theme.primary}>
                {regeneratingType === 'summary' ? '生成中...' : '重新生成'}
              </ThemedText>
            </TouchableOpacity>
          </View>
          {generatedContent.summaryOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.optionCard,
                selectedSummaryIds.includes(option.id) && styles.optionCardSelected,
                selectedSummaryIds.includes(option.id) && { borderColor: theme.primary }
              ]}
              onPress={() => handleToggleOption('summary', option.id)}
              activeOpacity={0.7}
            >
              <View style={styles.optionHeader}>
                <ThemedText variant="smallMedium" color={theme.textPrimary} style={styles.optionTitle}>
                  {option.title}
                </ThemedText>
                {selectedSummaryIds.includes(option.id) && (
                  <View style={[styles.checkBadge, { backgroundColor: theme.primary }]}>
                    <ThemedText variant="caption" color={theme.buttonPrimaryText}>
                      {selectedSummaryIds.indexOf(option.id) + 1}
                    </ThemedText>
                  </View>
                )}
              </View>
              <ThemedText variant="caption" color={theme.textSecondary} style={styles.optionDescription}>
                {option.description}
              </ThemedText>
              <ThemedText variant="caption" color={theme.textMuted} style={styles.optionRationale}>
                {option.rationale}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </ThemedView>

        {/* Learning Map */}
        <ThemedView level="default" style={styles.section}>
          <ThemedText variant="h4" color={theme.textPrimary} style={styles.sectionTitle}>
            学习地图与过程性评估
          </ThemedText>
          <View style={styles.objectiveContainer}>
            <View style={styles.objectiveCard}>
              <ThemedText variant="smallMedium" color={theme.textPrimary} style={styles.objectiveLabel}>
                基础层路径
              </ThemedText>
              <ThemedText variant="caption" color={theme.textSecondary}>
                {generatedContent.learningMap.basic}
              </ThemedText>
            </View>
            <View style={styles.objectiveCard}>
              <ThemedText variant="smallMedium" color={theme.textPrimary} style={styles.objectiveLabel}>
                核心层路径
              </ThemedText>
              <ThemedText variant="caption" color={theme.textSecondary}>
                {generatedContent.learningMap.core}
              </ThemedText>
            </View>
            <View style={styles.objectiveCard}>
              <ThemedText variant="smallMedium" color={theme.textPrimary} style={styles.objectiveLabel}>
                挑战层路径
              </ThemedText>
              <ThemedText variant="caption" color={theme.textSecondary}>
                {generatedContent.learningMap.challenge}
              </ThemedText>
            </View>
          </View>
        </ThemedView>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ThemedText variant="smallMedium" color={theme.textPrimary}>
              返回
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handlePreview}
            activeOpacity={0.7}
          >
            <ThemedText variant="smallMedium" color={theme.buttonPrimaryText}>
              生成完整教案
            </ThemedText>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Screen>
  );
}
