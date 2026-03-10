import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { Audio } from 'expo-av';
import RNSSE from 'react-native-sse';
import Markdown from 'react-native-markdown-display';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { createStyles } from './styles';
import { Theme } from '@/constants/theme';

// Markdown styles helper
const getMarkdownStyles = (theme: Theme) => ({
  body: {
    color: theme.textPrimary,
    fontSize: 14,
    lineHeight: 22,
  },
  heading1: {
    color: theme.textPrimary,
    fontSize: 20,
    fontWeight: 'bold' as const,
    marginTop: 16,
    marginBottom: 8,
  },
  heading2: {
    color: theme.textPrimary,
    fontSize: 18,
    fontWeight: 'bold' as const,
    marginTop: 14,
    marginBottom: 6,
  },
  heading3: {
    color: theme.textPrimary,
    fontSize: 16,
    fontWeight: '600' as const,
    marginTop: 12,
    marginBottom: 6,
  },
  heading4: {
    color: theme.textPrimary,
    fontSize: 15,
    fontWeight: '600' as const,
    marginTop: 10,
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
    padding: 8,
    borderLeftWidth: 3,
    borderLeftColor: theme.primary,
    marginVertical: 8,
  },
  code_inline: {
    backgroundColor: theme.backgroundTertiary,
    padding: 3,
    borderRadius: 3,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  code_block: {
    backgroundColor: theme.backgroundTertiary,
    padding: 10,
    borderRadius: 6,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginVertical: 8,
  },
  fence: {
    backgroundColor: theme.backgroundTertiary,
    padding: 10,
    borderRadius: 6,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginVertical: 8,
  },
  hr: {
    backgroundColor: theme.border,
    height: 1,
    marginVertical: 12,
  },
  list_item: {
    marginBottom: 4,
  },
  bullet_list: {
    marginLeft: 16,
    marginBottom: 8,
  },
  ordered_list: {
    marginLeft: 16,
    marginBottom: 8,
  },
  paragraph: {
    marginBottom: 8,
  },
});

type SectionType = 'intro' | 'activity' | 'summary';

interface AdjustmentParams {
  type: SectionType;
  index: number;
  data: string;
  expandedSections?: string;
  adjustmentRequest?: string;
  teacherName?: string;
  grade?: string;
  subject?: string;
  knowledgePoint?: string;
  courseObjective?: string;
  lessonDate?: string;
  tieredObjectives?: string;
  introOptions?: string;
  activityOptions?: string;
  summaryOptions?: string;
  learningMap?: string;
}

export default function AdjustmentScreen() {
  const { theme } = useTheme();
  const router = useSafeRouter();
  const params = useSafeSearchParams<AdjustmentParams>();
  const styles = createStyles(theme);
  const markdownStyles = useMemo(() => getMarkdownStyles(theme), [theme]);

  const [adjustmentRequest, setAdjustmentRequest] = useState('');
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [displayedContent, setDisplayedContent] = useState(''); // 实时显示的内容
  const [showAdjustedContent, setShowAdjustedContent] = useState(false); // 是否显示调整后的内容
  const sseRef = useRef<RNSSE | null>(null); // SSE 连接引用
  const recordingRef = useRef<Audio.Recording | null>(null); // 录音对象引用

  // 申请录音权限
  useEffect(() => {
    (async () => {
      const { status } = await Audio.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  // 从路由参数中获取调整的选项信息
  const adjustingOption = params
    ? { type: params.type, index: params.index || 0, data: JSON.parse(params.data as any) }
    : null;

  const adjustingSection: SectionType | null = params?.type || null;
  const expandedSections = params?.expandedSections ? JSON.parse(params.expandedSections as any) : {};

  useEffect(() => {
    // 如果有历史记录，恢复调整请求
    if (params?.adjustmentRequest) {
      setAdjustmentRequest(params.adjustmentRequest as string);
    }
  }, [params?.adjustmentRequest]);

  // 清理 SSE 连接和录音对象
  useEffect(() => {
    return () => {
      if (sseRef.current) {
        sseRef.current.close();
        sseRef.current = null;
      }
      // 清理录音对象
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(console.error);
        recordingRef.current = null;
      }
    };
  }, []);

  const handleBack = () => {
    router.back();
  };

  const handleAdjust = async () => {
    if (!adjustmentRequest.trim()) {
      Alert.alert('提示', '请输入您的调整需求');
      return;
    }

    // 如果已经显示了调整后的内容，清除之前的显示
    if (showAdjustedContent) {
      setShowAdjustedContent(false);
    }

    setIsAdjusting(true);
    setDisplayedContent(''); // 清空显示内容
    setShowAdjustedContent(true); // 立即显示区域，准备接收内容

    try {
      /**
       * 服务端文件：server/src/routes/lesson-plans.ts
       * 接口：POST /api/v1/lesson-plans/adjust-section (SSE流式输出)
       * Body 参数：teacherName: string, grade: string, subject: string, knowledgePoint: string, courseObjective: string, lessonDate: string, sectionType: string, currentContent: string, adjustmentRequest: string, tieredObjectives: object, introOptions: array, activityOptions: array, summaryOptions: array, learningMap: object
       */

      // 判断是否是板块调整
      const isSectionAdjustment = !!params?.expandedSections;
      const sectionType = params?.type || '';

      // 获取当前内容
      let currentContent = '';
      if (isSectionAdjustment) {
        // 板块调整：使用expandedSections中的内容
        currentContent = expandedSections[sectionType] || '';
      } else {
        // 选项调整：使用选项的描述
        currentContent = adjustingOption?.data.description || '';
      }

      // 构建请求参数
      const requestData = {
        teacherName: params?.teacherName ?? '',
        grade: params?.grade ?? '',
        subject: params?.subject ?? '',
        knowledgePoint: params?.knowledgePoint ?? '',
        courseObjective: params?.courseObjective ?? '',
        lessonDate: params?.lessonDate ?? '',
        sectionType: sectionType,
        currentContent: currentContent,
        adjustmentRequest,
        tieredObjectives: params?.tieredObjectives ? JSON.parse((params.tieredObjectives as string)) : {},
        introOptions: params?.introOptions ? JSON.parse((params.introOptions as string)) : [],
        activityOptions: params?.activityOptions ? JSON.parse((params.activityOptions as string)) : [],
        summaryOptions: params?.summaryOptions ? JSON.parse((params.summaryOptions as string)) : [],
        learningMap: params?.learningMap ? JSON.parse((params.learningMap as string)) : {},
      };

      // 关闭之前的 SSE 连接（如果存在）
      if (sseRef.current) {
        sseRef.current.close();
        sseRef.current = null;
      }

      // 创建 SSE 连接
      const url = `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/lesson-plans/adjust-section`;
      const sse = new RNSSE(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
        pollingInterval: 0, // 禁用轮询
      });

      sseRef.current = sse;

      // 监听消息
      sse.addEventListener('message', (event) => {
        if (event.data === '[DONE]') {
          // 流结束
          sse.close();
          sseRef.current = null;
          setIsAdjusting(false);

          // 存储到AsyncStorage
          if (displayedContent) {
            try {
              const st = params?.type ?? '';
              AsyncStorage.setItem('ADJUSTED_SECTION', st);
              AsyncStorage.setItem('ADJUSTED_CONTENT', displayedContent);
            } catch (storageError) {
              console.error('Failed to store adjusted content:', storageError);
            }
          }
          return;
        }

        // 确保 event.data 不是 null
        if (!event.data) {
          return;
        }

        try {
          const data = JSON.parse(event.data);
          if (data.content) {
            // 追加新内容到显示区域
            setDisplayedContent(prev => prev + data.content);
          } else if (data.error) {
            throw new Error(data.error);
          }
        } catch (parseError) {
          console.error('Error parsing SSE message:', parseError);
        }
      });

      // 监听错误
      sse.addEventListener('error', (event) => {
        console.error('SSE error:', event);
        setIsAdjusting(false);
        Alert.alert('调整失败', '生成过程中发生错误，请稍后再试');
        sse.close();
        sseRef.current = null;
      });

    } catch (error) {
      console.error('Error adjusting option:', error);
      setIsAdjusting(false);
      Alert.alert('调整失败', error instanceof Error ? error.message : '调整过程中发生错误，请稍后再试');
    }
  };

  const handleSaveAdjustment = async () => {
    // 将调整后的内容保存到后端，取代原有方案
    setIsAdjusting(true);
    try {
      const sectionType = params?.type || '';
      const content = displayedContent || '';

      // 存储到AsyncStorage（preview页面会读取）
      await AsyncStorage.setItem('ADJUSTED_SECTION', sectionType);
      await AsyncStorage.setItem('ADJUSTED_CONTENT', content);

      Alert.alert('保存成功', '调整已保存，将返回预览页面', [
        {
          text: '确定',
          onPress: () => {
            router.back();
          },
        },
      ]);
    } catch (error) {
      console.error('Error saving adjustment:', error);
      Alert.alert('保存失败', error instanceof Error ? error.message : '保存过程中发生错误，请稍后再试');
    } finally {
      setIsAdjusting(false);
    }
  };

  const startRecording = async () => {
    if (!hasPermission) {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('需要权限', '请授予录音权限');
        return;
      }
      setHasPermission(true);
    }

    // 如果已有录音对象，先清理
    if (recordingRef.current) {
      await recordingRef.current.stopAndUnloadAsync();
      recordingRef.current = null;
    }

    try {
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      recordingRef.current = recording;
      setIsRecording(true);
      setIsRecognizing(false);
    } catch (error) {
      console.error('录音失败:', error);
      Alert.alert('录音失败', '无法开始录音，请检查麦克风权限');
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;

    setIsRecording(false);
    setIsRecognizing(true); // 开始识别

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (uri) {
        // 读取音频文件并转换为 base64
        const audioBase64 = await (FileSystem as any).readAsStringAsync(uri, {
          encoding: (FileSystem as any).EncodingType.Base64,
        });

        // 调用后端语音识别接口
        /**
         * 服务端文件：server/src/routes/voice.ts
         * 接口：POST /api/v1/voice/recognize
         * Body 参数：base64Data: string (base64编码的音频数据)
         */
        const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/voice/recognize`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ base64Data: audioBase64 }),
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || '语音识别失败');
        }

        // 将识别结果追加到输入框（而不是替换）
        if (result.text) {
          setAdjustmentRequest(prev => {
            if (prev) {
              // 如果已有内容，先加空格再追加新内容
              return prev + ' ' + result.text;
            } else {
              // 如果没有内容，直接使用识别结果
              return result.text;
            }
          });
        } else {
          throw new Error('未识别到语音内容');
        }
      }
    } catch (error) {
      console.error('语音识别失败:', error);
      Alert.alert('语音识别失败', error instanceof Error ? error.message : '无法识别语音，请重试或使用文字输入');
    } finally {
      setIsRecognizing(false);
    }
  };

  const getSectionTitle = () => {
    if (adjustingSection === 'intro') return '导入阶段';
    if (adjustingSection === 'activity') return '课堂活动';
    if (adjustingSection === 'summary') return '总结阶段';
    return '';
  };

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={theme.backgroundRoot === '#ffffff' ? 'dark' : 'light'}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} activeOpacity={0.7}>
            <FontAwesome6 name="arrow-left" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <ThemedText variant="h4" color={theme.textPrimary}>
            AI个性化调整 - {getSectionTitle()}
          </ThemedText>
          <View style={{ width: 24 }} />
        </View>

        {/* Content */}
        <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollContentContainer}>
          {adjustingSection ? (
            <>
              {/* 当前扩写内容 */}
              <ThemedText variant="smallMedium" color={theme.textPrimary} style={styles.sectionTitle}>
                当前扩写内容
              </ThemedText>
              <View style={styles.currentOptionCard}>
                <ThemedText variant="body" color={theme.textSecondary} style={styles.currentOptionDesc}>
                  {expandedSections[adjustingSection] || '暂无内容'}
                </ThemedText>
              </View>
            </>
          ) : (
            <>
              {/* 当前活动设计 */}
              <ThemedText variant="smallMedium" color={theme.textPrimary} style={styles.sectionTitle}>
                当前活动设计
              </ThemedText>
              <View style={styles.currentOptionCard}>
                <ThemedText variant="h4" color={theme.textPrimary}>
                  {adjustingOption?.data.title}
                </ThemedText>
                <ThemedText variant="body" color={theme.textSecondary} style={styles.currentOptionDesc}>
                  {adjustingOption?.data.description}
                </ThemedText>
                {adjustingOption?.data.principle && (
                  <ThemedText variant="caption" color={theme.textMuted} style={styles.principleText}>
                    设计理念：{adjustingOption.data.principle}
                  </ThemedText>
                )}
              </View>
            </>
          )}

          {/* 调整后的内容 */}
          {showAdjustedContent && (
            <>
              <ThemedText variant="smallMedium" color={theme.primary} style={styles.sectionTitle}>
                ✨ 调整后的内容 {isAdjusting && '(正在生成...)'}
              </ThemedText>
              <View style={[styles.currentOptionCard, styles.adjustedContentCard, styles.markdownContainer]}>
                {isAdjusting && !displayedContent ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={theme.primary} />
                    <ThemedText variant="body" color={theme.textMuted} style={styles.loadingText}>
                      AI正在调整内容...
                    </ThemedText>
                  </View>
                ) : displayedContent ? (
                  <Markdown style={markdownStyles}>
                    {displayedContent}
                  </Markdown>
                ) : null}
              </View>
            </>
          )}

          {/* 调整需求输入 */}
          <ThemedText variant="smallMedium" color={theme.textPrimary} style={styles.sectionTitle}>
            您的调整需求
          </ThemedText>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.adjustmentInput}
              placeholder="请描述您希望如何调整这个环节，例如：'增加互动环节'、'更适合大班授课'、'增加动手操作机会'、'简化活动步骤'"
              placeholderTextColor={theme.textMuted}
              value={adjustmentRequest}
              onChangeText={setAdjustmentRequest}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={[
                styles.voiceButton,
                isRecording && styles.voiceButtonRecording,
                isRecognizing && styles.voiceButtonRecognizing,
              ]}
              onPressIn={startRecording}
              onPressOut={stopRecording}
              disabled={isRecognizing}
              activeOpacity={0.7}
            >
              {isRecognizing ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <>
                  <FontAwesome6
                    name="microphone"
                    size={20}
                    color={isRecording ? '#fff' : theme.primary}
                  />
                  <ThemedText variant="smallMedium" color={isRecording ? '#fff' : theme.primary} style={styles.voiceButtonText}>
                    {isRecording ? '松手结束识别' : '按住说话'}
                  </ThemedText>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* 提示信息 */}
          <ThemedText variant="caption" color={theme.textMuted} style={styles.hint}>
            💡 提示：AI会根据您的需求，结合教育理念调整整个环节的扩写内容
          </ThemedText>
        </ScrollView>

        {/* Footer Actions */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.footerButton, styles.confirmButton]}
            onPress={handleAdjust}
            disabled={isAdjusting || !adjustmentRequest.trim()}
            activeOpacity={0.7}
          >
            {isAdjusting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <ThemedText variant="smallMedium" color={theme.buttonPrimaryText}>
                确认调整
              </ThemedText>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.footerButton, styles.saveButton, !displayedContent && styles.disabledButton]}
            onPress={handleSaveAdjustment}
            disabled={!displayedContent}
            activeOpacity={0.7}
          >
            <ThemedText variant="smallMedium" color={displayedContent ? theme.buttonPrimaryText : theme.textMuted}>
              保存调整
            </ThemedText>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}


