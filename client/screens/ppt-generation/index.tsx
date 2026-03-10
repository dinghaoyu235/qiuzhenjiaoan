import React, { useState, useRef, useMemo, useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  KeyboardAvoidingView,
  RefreshControl,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { FontAwesome6 } from '@expo/vector-icons';
import RNSSE from 'react-native-sse';
import { useFocusEffect } from 'expo-router';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { useTheme } from '@/hooks/useTheme';
import { createFormDataFile } from '@/utils';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { TextInput } from '@/components/TextInput';
import { createStyles } from './styles';

type LessonPlan = {
  id: number;
  teacher_name: string;
  grade: string;
  subject: string;
  knowledge_point: string;
  course_objective: string;
  lesson_date: string;
  full_plan: string; // Make required as it's always present in database
  tiered_objectives?: {
    basic: string;
    core: string;
    challenge: string;
  };
  intro_options?: Array<{
    id: number;
    title: string;
    description: string;
    rationale: string;
  }>;
  activity_options?: Array<{
    id: number;
    title: string;
    description: string;
    rationale: string;
  }>;
  summary_options?: Array<{
    id: number;
    title: string;
    description: string;
    rationale: string;
  }>;
  learning_map?: {
    basic: string;
    core: string;
    challenge: string;
  };
  created_at: string;
};

export default function PPTGenerationScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();
  const params = useSafeSearchParams<{ lessonPlanId?: string }>();

  // Form state
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonObjective, setLessonObjective] = useState('');
  const [teachingKeyPoints, setTeachingKeyPoints] = useState('');
  const [targetAudience, setTargetAudience] = useState('小学生');
  const [estimatedDuration, setEstimatedDuration] = useState('45分钟');
  const [selectedStyle, setSelectedStyle] = useState<string>('minimal');

  // PPT style options
  const pptStyleOptions = [
    { id: 'minimal', name: '简约现代', description: '简洁大方，适合大多数课程', icon: 'feather' },
    { id: 'handdrawn', name: '手绘卡通', description: '生动有趣，适合小学和幼儿园', icon: 'pencil' },
    { id: 'academic', name: '学术专业', description: '严肃专业，适合高中和大学', icon: 'graduation-cap' },
    { id: 'warm', name: '温馨亲切', description: '温暖友好，适合情感教育', icon: 'heart' },
    { id: 'tech', name: '科技未来', description: '科技感强，适合科学课', icon: 'rocket' },
    { id: 'classic', name: '古典雅致', description: '文化感强，适合语文历史课', icon: 'scroll' },
    { id: 'nature', name: '自然清新', description: '自然风格，适合生物地理课', icon: 'leaf' },
    { id: 'vibrant', name: '活力活泼', description: '充满活力，适合体育音乐课', icon: 'music' },
  ];

  // History lesson plans state
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
  const [loadingLessonPlans, setLoadingLessonPlans] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string>('全部');

  // File upload state
  const [lessonPlanFile, setLessonPlanFile] = useState<{ uri: string; name: string } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [transcription, setTranscription] = useState('');

  // PPT generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState('');

  const recordingRef = useRef<Audio.Recording | null>(null);

  // Navigate back to home selection
  const handleBackToHome = () => {
    router.navigate('/');
  };

  // Fetch lesson plans on page focus
  useFocusEffect(
    useCallback(() => {
      fetchLessonPlans();
      // Check if lessonPlanId is passed from detail page
      if (params.lessonPlanId) {
        const lessonPlanId = parseInt(params.lessonPlanId, 10);
        if (!isNaN(lessonPlanId)) {
          console.log('[useFocusEffect] Loading lesson plan by ID:', lessonPlanId);
          loadLessonPlanById(lessonPlanId);
        } else {
          console.error('[useFocusEffect] Invalid lessonPlanId:', params.lessonPlanId);
        }
      }
    }, [params.lessonPlanId])
  );

  // Fetch lesson plans from history
  const fetchLessonPlans = async (showLoading: boolean = true) => {
    try {
      if (showLoading) {
        setLoadingLessonPlans(true);
      }

      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/lesson-plans`);
      const result = await response.json();

      if (response.ok && result.data) {
        setLessonPlans(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch lesson plans:', error);
      Alert.alert('错误', '获取历史教案失败');
    } finally {
      if (showLoading) {
        setLoadingLessonPlans(false);
      }
      setRefreshing(false);
    }
  };

  // Load lesson plan by ID (from URL params)
  const loadLessonPlanById = async (id: number) => {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/lesson-plans/${id}`);
      const result = await response.json();

      if (response.ok && result.data) {
        const lessonPlan = result.data;
        console.log('[loadLessonPlanById] Loaded lesson plan:', {
          id: lessonPlan.id,
          subject: lessonPlan.subject,
          knowledge_point: lessonPlan.knowledge_point,
          full_plan_exists: !!lessonPlan.full_plan,
          full_plan_length: lessonPlan.full_plan?.length || 0,
        });
        fillFormWithLessonPlan(lessonPlan);
        Alert.alert('成功', '教案已加载');
      }
    } catch (error) {
      console.error('Failed to load lesson plan:', error);
      Alert.alert('错误', '加载教案失败');
    }
  };

  // Fill form with lesson plan data
  const fillFormWithLessonPlan = (lessonPlan: LessonPlan) => {
    console.log('[fillFormWithLessonPlan] Called with:', {
      subject: lessonPlan.subject,
      grade: lessonPlan.grade,
      knowledge_point: lessonPlan.knowledge_point,
      course_objective: lessonPlan.course_objective,
      full_plan_exists: !!lessonPlan.full_plan,
      full_plan_length: lessonPlan.full_plan?.length || 0,
    });

    if (lessonPlan.subject) setSubject(lessonPlan.subject);
    if (lessonPlan.grade) setGrade(lessonPlan.grade);
    if (lessonPlan.knowledge_point) setLessonTitle(lessonPlan.knowledge_point);
    if (lessonPlan.course_objective) setLessonObjective(lessonPlan.course_objective);
    
    // Use full_plan as teaching key points if available, otherwise use knowledge_point
    if (lessonPlan.full_plan) {
      console.log('[fillFormWithLessonPlan] Setting teachingKeyPoints from full_plan (length:', lessonPlan.full_plan.length, ')');
      setTeachingKeyPoints(lessonPlan.full_plan);
    } else if (lessonPlan.knowledge_point) {
      console.log('[fillFormWithLessonPlan] full_plan not available, using knowledge_point');
      setTeachingKeyPoints(lessonPlan.knowledge_point);
    } else {
      console.warn('[fillFormWithLessonPlan] Neither full_plan nor knowledge_point available');
    }
    
    if (lessonPlan.lesson_date) {
      // Parse lesson_date and calculate duration (simplified)
      setEstimatedDuration('45分钟');
    }
  };

  // Handle select lesson plan from history
  const handleSelectLessonPlan = (lessonPlan: LessonPlan) => {
    fillFormWithLessonPlan(lessonPlan);
    setShowHistoryModal(false);
    Alert.alert('成功', '教案已加载到表单');
  };

  // Helper function to fix common JSON errors
  const tryFixJSON = (jsonStr: string): string | null => {
    console.log('[tryFixJSON] Attempting to fix JSON...');
    console.log('[tryFixJSON] Input JSON length:', jsonStr.length);
    console.log('[tryFixJSON] Input JSON preview:', jsonStr.substring(0, 200));
    
    try {
      // Fix 1: Remove trailing comma before closing brackets/braces
      let fixed = jsonStr.replace(/,(\s*[}\]])/g, '$1');
      console.log('[tryFixJSON] Removed trailing commas');
      
      // Fix 2: Fix missing quotes around property names
      fixed = fixed.replace(/([{,]\s*)([a-z_]\w*)\s*:/gi, '$1"$2":');
      console.log('[tryFixJSON] Added quotes to property names');
      
      // Fix 3: Fix single quotes to double quotes
      fixed = fixed.replace(/'/g, '"');
      console.log('[tryFixJSON] Converted single quotes to double quotes');
      
      // Try to parse the fixed JSON
      JSON.parse(fixed);
      console.log('[tryFixJSON] Successfully fixed JSON');
      return fixed;
    } catch (e) {
      console.log('[tryFixJSON] Basic fixes did not work, error:', (e as Error).message);
      
      // Try to find and close unclosed brackets
      const openBraces = (jsonStr.match(/\{/g) || []).length;
      const closeBraces = (jsonStr.match(/\}/g) || []).length;
      const openBrackets = (jsonStr.match(/\[/g) || []).length;
      const closeBrackets = (jsonStr.match(/\]/g) || []).length;
      
      console.log('[tryFixJSON] Bracket counts:', {
        openBraces,
        closeBraces,
        openBrackets,
        closeBrackets,
      });
      
      let fixed = jsonStr;
      
      // Fix 4: Add missing closing braces
      for (let i = 0; i < openBraces - closeBraces; i++) {
        fixed += '}';
      }
      
      // Fix 5: Add missing closing brackets
      for (let i = 0; i < openBrackets - closeBrackets; i++) {
        fixed += ']';
      }
      
      // Also apply basic fixes
      fixed = fixed.replace(/,(\s*[}\]])/g, '$1');
      
      try {
        JSON.parse(fixed);
        console.log('[tryFixJSON] Successfully fixed JSON (added missing brackets)');
        return fixed;
      } catch (e2) {
        console.log('[tryFixJSON] Adding missing brackets did not fix the issue');
        return null;
      }
    }
  };

  // Handle refresh lesson plans
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLessonPlans(false);
  };

  // Handle lesson plan file upload
  const handlePickLessonPlan = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/plain', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];
        setLessonPlanFile({ uri: file.uri, name: file.name });

        // Auto-analyze the lesson plan
        await analyzeLessonPlan(file.uri);
      }
    } catch (error) {
      console.error('Failed to pick lesson plan:', error);
      Alert.alert('错误', '选择教案失败，请稍后重试');
    }
  };

  // Analyze lesson plan
  const analyzeLessonPlan = async (fileUri: string) => {
    setIsAnalyzing(true);
    try {
      /**
       * 服务端文件：server/src/routes/ppt-generation.ts
       * 接口：POST /api/v1/ppt/analyze-lesson
       * Body 参数：lessonPlan: File
       */
      const formData = new FormData();
      const file = await createFormDataFile(fileUri, lessonPlanFile?.name || 'lesson-plan.txt', 'text/plain');
      formData.append('lessonPlan', file as any);

      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/ppt/analyze-lesson`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.data?.analyzedData) {
        const { analyzedData } = result.data;
        if (analyzedData.subject) setSubject(analyzedData.subject);
        if (analyzedData.grade) setGrade(analyzedData.grade);
        if (analyzedData.lessonTitle) setLessonTitle(analyzedData.lessonTitle);
        if (analyzedData.lessonObjective) setLessonObjective(analyzedData.lessonObjective);
        if (analyzedData.teachingKeyPoints) setTeachingKeyPoints(analyzedData.teachingKeyPoints);
        if (analyzedData.targetAudience) setTargetAudience(analyzedData.targetAudience);
        if (analyzedData.estimatedDuration) setEstimatedDuration(analyzedData.estimatedDuration);

        Alert.alert('成功', '教案分析完成');
      } else {
        Alert.alert('提示', '教案分析成功，但未提取到详细信息，请手动填写');
      }
    } catch (error) {
      console.error('Failed to analyze lesson plan:', error);
      Alert.alert('错误', '教案分析失败，请手动填写');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle voice recording
  const handleVoiceRecord = async () => {
    try {
      if (isRecording) {
        // Stop recording
        if (recordingRef.current) {
          await recordingRef.current.stopAndUnloadAsync();
          const uri = recordingRef.current.getURI();
          setRecording(null);
          setIsRecording(false);
          recordingRef.current = null;

          // Transcribe the audio
          if (uri) {
            await transcribeAudio(uri);
          }
        }
      } else {
        // Start recording
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('权限提示', '需要麦克风权限才能录音');
          return;
        }

        const { recording: newRecording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        setRecording(newRecording);
        setIsRecording(true);
        recordingRef.current = newRecording;
      }
    } catch (error) {
      console.error('Voice recording error:', error);
      Alert.alert('错误', '录音失败，请稍后重试');
    }
  };

  // Transcribe audio
  const transcribeAudio = async (audioUri: string) => {
    try {
      Alert.alert('处理中', '正在转写语音...');
      /**
       * 服务端文件：server/src/routes/voice.ts
       * 接口：POST /api/v1/voice/transcribe
       * Body 参数：audio: File
       */
      const formData = new FormData();
      const file = await createFormDataFile(audioUri, 'voice.m4a', 'audio/m4a');
      formData.append('audio', file as any);

      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/voice/transcribe`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.data?.transcription) {
        setTranscription(result.data.transcription);
        Alert.alert('成功', '语音转写完成');

        // Try to parse form fields from transcription
        if (!lessonTitle) setLessonTitle(result.data.transcription.substring(0, 50));
      } else {
        Alert.alert('错误', result.error || '语音转写失败');
      }
    } catch (error) {
      console.error('Transcription error:', error);
      Alert.alert('错误', '语音转写失败，请稍后重试');
    }
  };

  // Generate PPT
  const handleGeneratePPT = async () => {
    if (!lessonTitle) {
      Alert.alert('提示', '请至少填写课程标题');
      return;
    }

    setIsGenerating(true);
    setGenerationProgress('正在生成 PPT...');

    try {
      /**
       * 服务端文件：server/src/routes/ppt-generation.ts
       * 接口：POST /api/v1/ppt/generate
       * Body 参数：subject: string, grade: string, lessonTitle: string, lessonObjective: string,
       *             teachingKeyPoints: string, targetAudience: string, estimatedDuration: string,
       *             style: string
       */
      const formData = new FormData();
      formData.append('subject', subject || '语文');
      formData.append('grade', grade || '小学1年级');
      formData.append('lessonTitle', lessonTitle);
      formData.append('lessonObjective', lessonObjective || '');
      formData.append('teachingKeyPoints', teachingKeyPoints || '');
      formData.append('targetAudience', targetAudience);
      formData.append('estimatedDuration', estimatedDuration);
      formData.append('style', selectedStyle);

      if (lessonPlanFile) {
        const file = await createFormDataFile(lessonPlanFile.uri, lessonPlanFile.name, 'text/plain');
        formData.append('lessonPlan', file as any);
      }

      const sseUrl = `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/ppt/generate`;
      const sse = new RNSSE(sseUrl, {
        method: 'POST',
        body: formData,
      });

      let fullContent = '';

      sse.addEventListener('message', (event: any) => {
        if (event.data === '[DONE]') {
          sse.close();
          setGenerationProgress('正在生成预览图片...');

          // Parse the generated PPT structure
          console.log('Full content length:', fullContent.length);
          console.log('Full content preview:', fullContent.substring(0, 200));
          
          try {
            // Try to parse full content as JSON directly first
            let pptData: any = null;
            
            try {
              pptData = JSON.parse(fullContent);
              console.log('[parsePPTData] Successfully parsed full content as JSON');
            } catch (e) {
              console.log('[parsePPTData] Full content is not valid JSON, trying to extract JSON...');
              
              // Try to extract JSON from the content
              const jsonMatch = fullContent.match(/\{[\s\S]*\}/);
              console.log('[parsePPTData] JSON match found:', !!jsonMatch);
              
              if (jsonMatch) {
                const jsonStr = jsonMatch[0];
                console.log('[parsePPTData] JSON string length:', jsonStr.length);
                
                try {
                  pptData = JSON.parse(jsonStr);
                  console.log('[parsePPTData] Successfully parsed extracted JSON');
                } catch (jsonParseError) {
                  console.error('[parsePPTData] JSON parse error:', jsonParseError);
                  
                  // Try to fix common JSON errors
                  const fixedJson = tryFixJSON(jsonStr);
                  if (fixedJson) {
                    try {
                      pptData = JSON.parse(fixedJson);
                      console.log('[parsePPTData] Successfully parsed fixed JSON');
                    } catch (fixedParseError) {
                      console.error('[parsePPTData] Fixed JSON parse error:', fixedParseError);
                      pptData = null;
                    }
                  } else {
                    console.error('[parsePPTData] Unable to fix JSON automatically');
                    // Provide detailed error information
                    const errorInfo = `JSON解析失败在位置 ${jsonStr.length} 字符处。可能的原因：\n1. 数据不完整\n2. 格式错误\n\n建议：请尝试重新生成PPT。`;
                    console.error('[parsePPTData] Error details:', errorInfo);
                    console.error('[parsePPTData] Last 500 chars of JSON:', jsonStr.slice(-500));
                    pptData = null;
                  }
                }
              } else {
                console.error('[parsePPTData] No JSON found in response');
                pptData = null;
              }
            }
            
            if (pptData && pptData.slides && pptData.slides.length > 0) {
              console.log('[parsePPTData] Parsed PPT data:', {
                hasMetadata: !!pptData.metadata,
                slidesCount: pptData.slides.length,
                hasDesignGuidance: !!pptData.designGuidance,
              });
              
              // Generate preview images
              generatePreviewImages(pptData);
            } else {
              console.error('[parsePPTData] Invalid PPT data structure');
              setIsGenerating(false);
              Alert.alert(
                '生成失败',
                'PPT生成过程中出现错误，返回的数据格式不正确。建议：\n\n1. 简化教学重点内容\n2. 减少特殊字符\n3. 重新尝试生成',
                [{ text: '确定', onPress: () => {} }]
              );
            }
          } catch (parseError) {
            console.error('[parsePPTData] General parse error:', parseError);
            setIsGenerating(false);
            Alert.alert('提示', 'PPT 生成成功，但解析失败');
          }
          return;
        }

        try {
          const data = JSON.parse(event.data);
          if (data.type === 'chunk' && data.content) {
            fullContent += data.content;
            setGenerationProgress('正在生成 PPT... (' + fullContent.length + ' 字符)');
          }
        } catch (e) {
          // Ignore parse errors
        }
      });

      sse.addEventListener('error', (error: any) => {
        console.error('SSE error:', error);
        sse.close();
        setIsGenerating(false);
        Alert.alert('错误', 'PPT 生成失败，请稍后重试');
      });

    } catch (error) {
      console.error('PPT generation error:', error);
      setIsGenerating(false);
      Alert.alert('错误', 'PPT 生成失败，请稍后重试');
    }
  };

  // Generate preview images for PPT slides
  const generatePreviewImages = async (pptData: any) => {
    console.log('Starting preview images generation...');
    console.log('PPT data:', pptData);
    
    try {
      /**
       * 服务端文件：server/src/routes/ppt-generation.ts
       * 接口：POST /api/v1/ppt/generate-preview-images
       * Body 参数：pptStructure: object
       */
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/ppt/generate-preview-images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pptStructure: pptData }),
      });

      console.log('Preview images API response status:', response.status);
      const result = await response.json();
      console.log('Preview images API result:', result);

      if (response.ok && result.data) {
        setIsGenerating(false);
        console.log('Preview images generated successfully, navigating to preview page...');
        console.log('[generatePreviewImages] PPT data to send:', {
          hasMetadata: !!result.data.metadata,
          slidesCount: result.data.slides?.length || 0,
          hasImages: result.data.slides?.some((s: any) => s.imageUrl) || false,
        });
        // Navigate to preview page with PPT data (including images)
        const pptDataString = JSON.stringify(result.data);
        console.log('[generatePreviewImages] PPT data string length:', pptDataString.length);
        router.push('/ppt-preview', { pptData: pptDataString });
        Alert.alert('成功', 'PPT 生成完成');
      } else {
        console.error('Preview images generation failed:', result);
        setIsGenerating(false);
        // Navigate to preview page even if image generation fails
        console.log('Navigating to preview page with original data...');
        const pptDataString = JSON.stringify(pptData);
        console.log('[generatePreviewImages] Fallback PPT data string length:', pptDataString.length);
        router.push('/ppt-preview', { pptData: pptDataString });
        Alert.alert('警告', 'PPT 生成完成，但预览图片生成失败');
      }
    } catch (error) {
      console.error('Preview images generation error:', error);
      setIsGenerating(false);
      // Navigate to preview page even if image generation fails
      console.log('Navigating to preview page with original data (error case)...');
      const pptDataString = JSON.stringify(pptData);
      console.log('[generatePreviewImages] Error fallback PPT data string length:', pptDataString.length);
      router.push('/ppt-preview', { pptData: pptDataString });
      Alert.alert('警告', 'PPT 生成完成，但预览图片生成失败');
    }
  };

  // Remove lesson plan file
  const handleRemoveLessonPlan = () => {
    setLessonPlanFile(null);
  };

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <ThemedView level="root" style={styles.header}>
            <View style={styles.headerContent}>
              <View style={styles.headerLeft}>
                <View style={styles.logoIcon}>
                  <FontAwesome6 name="file-powerpoint" size={28} color="#FFFFFF" />
                </View>
                <View>
                  <ThemedText variant="h1" color={theme.textPrimary} style={styles.title}>
                    PPT 生成
                  </ThemedText>
                  <ThemedText variant="body" color={theme.textSecondary} style={styles.subtitle}>
                    智能生成演示文稿
                  </ThemedText>
                </View>
              </View>
              {/* Back Button */}
              <TouchableOpacity onPress={handleBackToHome} style={styles.backButton}>
                <FontAwesome6 name="arrow-left" size={20} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>
          </ThemedView>

          {/* Form */}
          <View style={styles.formContainer}>
            {/* Select from History */}
            <View style={styles.inputGroup}>
              <ThemedText variant="label" color={theme.textPrimary} style={styles.label}>
                选择历史教案（可选）
              </ThemedText>
              <TouchableOpacity
                onPress={() => setShowHistoryModal(true)}
                style={styles.historyButton}
              >
                <FontAwesome6 name="clock-rotate-left" size={20} color={theme.primary} />
                <ThemedText variant="smallMedium" color={theme.primary} style={styles.historyButtonText}>
                  从历史教案中选择
                </ThemedText>
              </TouchableOpacity>
            </View>

            {/* Upload Lesson Plan */}
            <View style={styles.inputGroup}>
              <ThemedText variant="label" color={theme.textPrimary} style={styles.label}>
                上传教案（可选）
              </ThemedText>
              {lessonPlanFile ? (
                <View style={styles.filePreview}>
                  <View style={styles.fileIconWrapper}>
                    <FontAwesome6 name="file-lines" size={24} color={theme.textPrimary} />
                  </View>
                  <View style={styles.fileInfo}>
                    <ThemedText variant="body" color={theme.textPrimary}>
                      {lessonPlanFile.name}
                    </ThemedText>
                    <ThemedText variant="caption" color={theme.textMuted}>
                      已上传
                    </ThemedText>
                  </View>
                  <TouchableOpacity onPress={handleRemoveLessonPlan} style={styles.removeButton}>
                    <FontAwesome6 name="xmark" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={handlePickLessonPlan}
                  style={styles.uploadButton}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? (
                    <ActivityIndicator color={theme.primary} />
                  ) : (
                    <>
                      <FontAwesome6 name="cloud-arrow-up" size={20} color={theme.primary} />
                      <ThemedText variant="smallMedium" color={theme.primary}>
                        点击上传教案文件
                      </ThemedText>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {/* Form Fields */}
            <View style={styles.inputGroup}>
              <ThemedText variant="label" color={theme.textPrimary} style={styles.label}>
                学科
              </ThemedText>
              <TextInput
                style={styles.input}
                placeholder="如：语文、数学、英语"
                value={subject}
                onChangeText={setSubject}
                placeholderTextColor={theme.textMuted}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText variant="label" color={theme.textPrimary} style={styles.label}>
                年级
              </ThemedText>
              <TextInput
                style={styles.input}
                placeholder="如：小学1年级、初中1年级"
                value={grade}
                onChangeText={setGrade}
                placeholderTextColor={theme.textMuted}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText variant="label" color={theme.textPrimary} style={styles.label}>
                课程标题 *
              </ThemedText>
              <TextInput
                style={styles.input}
                placeholder="请输入课程标题"
                value={lessonTitle}
                onChangeText={setLessonTitle}
                placeholderTextColor={theme.textMuted}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText variant="label" color={theme.textPrimary} style={styles.label}>
                课程目标
              </ThemedText>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="请输入课程目标"
                value={lessonObjective}
                onChangeText={setLessonObjective}
                placeholderTextColor={theme.textMuted}
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText variant="label" color={theme.textPrimary} style={styles.label}>
                教学重点
              </ThemedText>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="请输入教学重点"
                value={teachingKeyPoints}
                onChangeText={setTeachingKeyPoints}
                placeholderTextColor={theme.textMuted}
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText variant="label" color={theme.textPrimary} style={styles.label}>
                目标学生
              </ThemedText>
              <TextInput
                style={styles.input}
                placeholder="如：小学生"
                value={targetAudience}
                onChangeText={setTargetAudience}
                placeholderTextColor={theme.textMuted}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText variant="label" color={theme.textPrimary} style={styles.label}>
                预计时长
              </ThemedText>
              <TextInput
                style={styles.input}
                placeholder="如：45分钟"
                value={estimatedDuration}
                onChangeText={setEstimatedDuration}
                placeholderTextColor={theme.textMuted}
              />
            </View>

            {/* PPT Style Selection */}
            <View style={styles.inputGroup}>
              <ThemedText variant="label" color={theme.textPrimary} style={styles.label}>
                PPT 风格
              </ThemedText>
              <View style={styles.styleScrollWrapper}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.styleScroll}>
                  {pptStyleOptions.map((styleOption) => (
                    <TouchableOpacity
                      key={styleOption.id}
                      style={[
                        styles.styleOption,
                        selectedStyle === styleOption.id && styles.styleOptionActive,
                        {
                          backgroundColor:
                            selectedStyle === styleOption.id ? theme.primary : theme.backgroundTertiary,
                        },
                      ]}
                      onPress={() => setSelectedStyle(styleOption.id)}
                    >
                      <FontAwesome6
                        name={styleOption.icon as any}
                        size={24}
                        color={selectedStyle === styleOption.id ? '#FFFFFF' : theme.textPrimary}
                      />
                      <ThemedText
                        variant="smallMedium"
                        color={selectedStyle === styleOption.id ? '#FFFFFF' : theme.textPrimary}
                        style={styles.styleOptionName}
                      >
                        {styleOption.name}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              {selectedStyle && (
                <View style={styles.styleDescription}>
                  <ThemedText variant="caption" color={theme.textSecondary}>
                    {pptStyleOptions.find((s) => s.id === selectedStyle)?.description}
                  </ThemedText>
                </View>
              )}
            </View>

            {/* Voice Recording */}
            <View style={styles.inputGroup}>
              <ThemedText variant="label" color={theme.textPrimary} style={styles.label}>
                语音控制
              </ThemedText>
              <TouchableOpacity
                onPress={handleVoiceRecord}
                style={[styles.voiceButton, isRecording && styles.voiceButtonRecording]}
              >
                <FontAwesome6
                  name={isRecording ? 'microphone-slash' : 'microphone'}
                  size={24}
                  color={isRecording ? '#FFFFFF' : theme.textPrimary}
                />
                <ThemedText
                  variant="smallMedium"
                  color={isRecording ? '#FFFFFF' : theme.textPrimary}
                  style={styles.voiceButtonText}
                >
                  {isRecording ? '停止录音' : '点击录音'}
                </ThemedText>
              </TouchableOpacity>
              {transcription ? (
                <View style={styles.transcriptionContainer}>
                  <ThemedText variant="caption" color={theme.textSecondary} style={styles.transcriptionLabel}>
                    语音内容：
                  </ThemedText>
                  <ThemedText variant="body" color={theme.textPrimary}>
                    {transcription}
                  </ThemedText>
                </View>
              ) : null}
            </View>

            {/* Generate Button */}
            <TouchableOpacity
              onPress={handleGeneratePPT}
              style={styles.generateButton}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <FontAwesome6 name="wand-magic-sparkles" size={20} color="#FFFFFF" />
                  <ThemedText variant="smallMedium" color="#FFFFFF" style={styles.generateButtonText}>
                    生成 PPT
                  </ThemedText>
                </>
              )}
            </TouchableOpacity>

            {isGenerating && (
              <ThemedText variant="caption" color={theme.textSecondary} style={styles.progressText}>
                {generationProgress}
              </ThemedText>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* History Lesson Plans Modal */}
      <Modal
        visible={showHistoryModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowHistoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText variant="h3" color={theme.textPrimary}>
                选择历史教案
              </ThemedText>
              <TouchableOpacity onPress={() => setShowHistoryModal(false)}>
                <FontAwesome6 name="xmark" size={24} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.filterContainer}>
              <View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                  <TouchableOpacity
                    style={[styles.filterChip, selectedSubject === '全部' && styles.filterChipActive]}
                    onPress={() => setSelectedSubject('全部')}
                  >
                    <ThemedText
                      variant="caption"
                      color={selectedSubject === '全部' ? '#FFFFFF' : theme.textSecondary}
                    >
                      全部
                    </ThemedText>
                  </TouchableOpacity>
                  {Array.from(new Set(lessonPlans.map(plan => plan.subject))).map((subject) => (
                    <TouchableOpacity
                      key={subject}
                      style={[styles.filterChip, selectedSubject === subject && styles.filterChipActive]}
                      onPress={() => setSelectedSubject(subject)}
                    >
                      <ThemedText
                        variant="caption"
                        color={selectedSubject === subject ? '#FFFFFF' : theme.textSecondary}
                      >
                        {subject}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            <ScrollView
              style={styles.historyListContainer}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={theme.primary}
                />
              }
            >
              {loadingLessonPlans ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color={theme.primary} size="large" />
                  <ThemedText variant="body" color={theme.textSecondary} style={styles.loadingText}>
                    加载中...
                  </ThemedText>
                </View>
              ) : lessonPlans.filter(plan =>
                selectedSubject === '全部' || plan.subject === selectedSubject
              ).length === 0 ? (
                <View style={styles.emptyContainer}>
                  <FontAwesome6 name="folder-open" size={48} color={theme.textMuted} />
                  <ThemedText variant="body" color={theme.textSecondary} style={styles.emptyText}>
                    暂无教案
                  </ThemedText>
                </View>
              ) : (
                lessonPlans
                  .filter(plan => selectedSubject === '全部' || plan.subject === selectedSubject)
                  .map((plan) => (
                    <TouchableOpacity
                      key={plan.id}
                      style={styles.historyItem}
                      onPress={() => handleSelectLessonPlan(plan)}
                    >
                      <View style={styles.historyItemContent}>
                        <View style={styles.historyItemHeader}>
                          <ThemedText variant="h4" color={theme.textPrimary} style={styles.historyItemTitle}>
                            {plan.knowledge_point}
                          </ThemedText>
                          <View style={styles.historyItemMeta}>
                            <View style={[styles.subjectTag, { backgroundColor: theme.backgroundTertiary }]}>
                              <ThemedText variant="caption" color={theme.textPrimary}>
                                {plan.subject}
                              </ThemedText>
                            </View>
                            <View style={[styles.gradeTag, { backgroundColor: theme.backgroundTertiary }]}>
                              <ThemedText variant="caption" color={theme.textPrimary}>
                                {plan.grade}
                              </ThemedText>
                            </View>
                          </View>
                        </View>
                        <ThemedText
                          variant="body"
                          color={theme.textSecondary}
                          style={styles.historyItemObjective}
                          numberOfLines={2}
                        >
                          {plan.course_objective}
                        </ThemedText>
                        <View style={styles.historyItemFooter}>
                          <ThemedText variant="caption" color={theme.textMuted}>
                            {plan.lesson_date}
                          </ThemedText>
                          <FontAwesome6 name="chevron-right" size={16} color={theme.textMuted} />
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => setShowHistoryModal(false)}
              >
                <ThemedText variant="smallMedium" color="#FFFFFF">
                  关闭
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
