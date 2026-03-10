import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
  TouchableWithoutFeedback,
  Image,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { Audio } from 'expo-av';
import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { FontAwesome6 } from '@expo/vector-icons';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { TextInput } from '@/components/TextInput';
import Select from '@/components/Select';
import { QuoteBanner } from '@/components/QuoteBanner';
import { createStyles } from './styles';

type Grade = '小学1年级' | '小学2年级' | '小学3年级' | '小学4年级' | '小学5年级' | '小学6年级' |
  '初中1年级' | '初中2年级' | '初中3年级';

type Subject = '语文' | '数学' | '英语' | '科学' | '体育' | '美术' | '音乐';

type Model = 'doubao-seed-2-0-pro-260215' | 'deepseek-r1-250528' | 'kimi-k2-5-260127';

const GRADES: Grade[] = [
  '小学1年级', '小学2年级', '小学3年级', '小学4年级', '小学5年级', '小学6年级',
  '初中1年级', '初中2年级', '初中3年级',
];

const SUBJECTS: Subject[] = ['语文', '数学', '英语', '科学', '体育', '美术', '音乐'];

const MODELS: Array<{ id: Model; name: string; description: string; advantage: string }> = [
  { id: 'doubao-seed-2-0-pro-260215', name: '豆包 Pro 2.0', description: '旗舰模型，复杂推理能力强', advantage: '复杂推理能力强' },
  { id: 'deepseek-r1-250528', name: 'DeepSeek R1', description: '深度推理，研究分析专家', advantage: '深度推理专家' },
  { id: 'kimi-k2-5-260127', name: 'Kimi K2.5', description: '最智能模型，多模态能力', advantage: '多模态智能' },
];

type KnowledgePoint = {
  id: number;
  name: string;
  difficulty: number;
  description: string;
};

type TeacherName = {
  id: number;
  teacherName: string;
  createdAt: string;
  updatedAt: string;
};

export default function HomeScreen() {
  const router = useSafeRouter();
  const { theme, isDark } = useTheme();
  const styles = createStyles(theme);

  const [teacherName, setTeacherName] = useState('');
  const [grade, setGrade] = useState<Grade>('小学1年级');
  const [subject, setSubject] = useState<Subject>('语文');
  const [model, setModel] = useState<Model>('doubao-seed-2-0-pro-260215');
  const [knowledgePoint, setKnowledgePoint] = useState('');
  const [courseObjective, setCourseObjective] = useState('');
  const [supplementaryMaterial, setSupplementaryMaterial] = useState('');
  const [supplementaryImageUri, setSupplementaryImageUri] = useState<string | null>(null);
  const [supplementaryFile, setSupplementaryFile] = useState<{ name: string; uri: string; content?: string } | null>(null);
  
  // Knowledge points list state
  const [knowledgePointsList, setKnowledgePointsList] = useState<KnowledgePoint[]>([]);
  const [loadingKnowledgePoints, setLoadingKnowledgePoints] = useState(false);
  const [refreshingKnowledgePoints, setRefreshingKnowledgePoints] = useState(false);
  const [showKnowledgePointsSelector, setShowKnowledgePointsSelector] = useState(false);
  
  // Device ID
  const [deviceId, setDeviceId] = useState<string>('');
  
  // Teacher names history state
  const [teacherNamesList, setTeacherNamesList] = useState<TeacherName[]>([]);
  const [loadingTeacherNames, setLoadingTeacherNames] = useState(false);
  const [showTeacherNamesSelector, setShowTeacherNamesSelector] = useState(false);
  const [customTeacherName, setCustomTeacherName] = useState('');
  
  // Set current date
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const [lessonDate, setLessonDate] = useState(`${year}年${month}月${day}日`);
  
  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Handle date change for mobile platform
  const handleDateChange = (event: any, date?: Date) => {
    if (event.type === 'set' && date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      setLessonDate(`${year}年${month}月${day}日`);
    }
    setShowDatePicker(false);
  };

  // Trigger date picker
  const handlePressDate = () => {
    console.log('Date picker pressed, Platform:', Platform.OS);
    if (Platform.OS === 'web') {
      // For web, use prompt as a fallback
      const result = prompt('请输入日期（YYYY-MM-DD）：', new Date().toISOString().split('T')[0]);
      if (result) {
        const date = new Date(result);
        if (!isNaN(date.getTime())) {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          setLessonDate(`${year}年${month}月${day}日`);
        }
      }
    } else {
      console.log('Opening mobile date picker');
      setSelectedDate(new Date());
      setShowDatePicker(true);
    }
  };

  // Fetch knowledge points when grade and subject are selected
  useEffect(() => {
    const fetchKnowledgePoints = async () => {
      if (!grade || !subject) return;
      
      setLoadingKnowledgePoints(true);
      try {
        // Try to load from local storage first
        const storageKey = `knowledge-points-${grade}-${subject}`;
        const cachedData = await AsyncStorage.getItem(storageKey);
        
        if (cachedData) {
          try {
            const cachedPoints = JSON.parse(cachedData);
            setKnowledgePointsList(cachedPoints);
            setLoadingKnowledgePoints(false);
            return;
          } catch (parseError) {
            console.error('Failed to parse cached data:', parseError);
          }
        }
        
        // If no cache or parse failed, fetch from server
        const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/lesson-plans/knowledge-points`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ grade, subject }),
        });

        const result = await response.json();

        if (response.ok && result.data?.knowledgePoints) {
          setKnowledgePointsList(result.data.knowledgePoints);
          // Save to local storage
          try {
            await AsyncStorage.setItem(storageKey, JSON.stringify(result.data.knowledgePoints));
          } catch (saveError) {
            console.error('Failed to save to local storage:', saveError);
          }
        }
      } catch (error) {
        console.error('Failed to fetch knowledge points:', error);
      } finally {
        setLoadingKnowledgePoints(false);
      }
    };

    // Only fetch if grade and subject are selected
    if (grade && subject) {
      fetchKnowledgePoints();
    }
  }, [grade, subject]);

  // Get device ID
  useEffect(() => {
    const getDeviceId = async () => {
      try {
        const storedDeviceId = await AsyncStorage.getItem('device-id');
        if (storedDeviceId) {
          setDeviceId(storedDeviceId);
        } else {
          const newDeviceId = Crypto.randomUUID();
          await AsyncStorage.setItem('device-id', newDeviceId);
          setDeviceId(newDeviceId);
        }
      } catch (error) {
        console.error('Failed to get device ID:', error);
      }
    };
    
    getDeviceId();
  }, []);

  // Request permissions on first app launch
  useEffect(() => {
    const requestPermissions = async () => {
      try {
        // Request microphone permission
        const { status: micStatus } = await Audio.requestPermissionsAsync();
        if (micStatus !== 'granted') {
          console.warn('Microphone permission not granted');
        }

        // Request media library permission (only on mobile)
        if (Platform.OS !== 'web') {
          const { status: mediaStatus } = await MediaLibrary.requestPermissionsAsync();
          if (mediaStatus !== 'granted') {
            console.warn('Media library permission not granted');
          }
        }
      } catch (error) {
        console.error('Failed to request permissions:', error);
      }
    };

    requestPermissions();
  }, []);

  // Fetch teacher names history
  useEffect(() => {
    if (!deviceId) return;
    
    const fetchTeacherNames = async () => {
      try {
        const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/teacher-names?deviceId=${deviceId}`);
        const result = await response.json();
        
        if (response.ok && result.data?.teacherNames) {
          setTeacherNamesList(result.data.teacherNames);
        }
      } catch (error) {
        console.error('Failed to fetch teacher names:', error);
      }
    };
    
    fetchTeacherNames();
  }, [deviceId]);

  const handleGenerate = async () => {
    if (!teacherName.trim()) {
      alert('请输入教师姓名');
      return;
    }
    if (!knowledgePoint.trim()) {
      alert('请输入本节课知识点');
      return;
    }
    if (!courseObjective.trim()) {
      alert('请输入本节课课程目标');
      return;
    }

    // Save teacher name to history
    if (deviceId && teacherName.trim()) {
      try {
        await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/teacher-names`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            teacherName: teacherName.trim(),
            deviceId,
          }),
        });
      } catch (error) {
        console.error('Failed to save teacher name:', error);
        // Don't block the navigation if saving fails
      }
    }

    // Navigate to generation page with params
    router.push('/generate', {
      teacherName,
      grade,
      subject,
      model,
      knowledgePoint,
      courseObjective,
      lessonDate,
      supplementaryMaterial,
      supplementaryImageUri: supplementaryImageUri || undefined,
      supplementaryFile: supplementaryFile || undefined,
    });
  };

  const handleViewHistory = () => {
    router.push('/history');
  };

  const handlePickImage = async () => {
    try {
      // Request media library permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('权限提示', '需要相册权限才能选择图片');
        return;
      }

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSupplementaryImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Failed to pick image:', error);
      Alert.alert('错误', '选择图片失败，请稍后重试');
    }
  };

  const handleRemoveImage = () => {
    setSupplementaryImageUri(null);
  };

  const handlePickFile = async () => {
    try {
      // Pick document
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/plain', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];
        
        // Read file content if it's a text file
        let fileContent = '';
        if (file.mimeType === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
          try {
            fileContent = await (FileSystem as any).readAsStringAsync(file.uri, {
              // @ts-ignore - EncodingType is available at runtime but not in type definition
              encoding: 'utf8',
            });
          } catch (readError) {
            console.error('Failed to read file content:', readError);
            fileContent = ''; // Don't fail if we can't read content
          }
        }

        setSupplementaryFile({
          name: file.name,
          uri: file.uri,
          content: fileContent,
        });
      }
    } catch (error: any) {
      // @ts-ignore - isCancel is available at runtime but not in type definition
      if (!DocumentPicker.isCancel && !DocumentPicker.isCancel(error)) {
        console.error('Failed to pick file:', error);
        Alert.alert('错误', '选择文件失败，请稍后重试');
      }
    }
  };

  const handleRemoveFile = () => {
    setSupplementaryFile(null);
  };

  const handleSelectKnowledgePoint = (kp: KnowledgePoint) => {
    setKnowledgePoint(kp.name);
    setShowKnowledgePointsSelector(false);
  };

  // Teacher names handlers
  const handleSelectTeacherName = (tn: TeacherName) => {
    setTeacherName(tn.teacherName);
    setShowTeacherNamesSelector(false);
  };

  const handleAddCustomTeacherName = async () => {
    if (!customTeacherName.trim()) {
      Alert.alert('提示', '请输入教师姓名');
      return;
    }
    
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/teacher-names`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teacherName: customTeacherName.trim(),
          deviceId,
        }),
      });

      const result = await response.json();

      if (response.ok && result.data) {
        setTeacherName(customTeacherName.trim());
        setCustomTeacherName('');
        setShowTeacherNamesSelector(false);
        
        // Refresh the list
        const listResponse = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/teacher-names?deviceId=${deviceId}`);
        const listResult = await listResponse.json();
        if (listResponse.ok && listResult.data?.teacherNames) {
          setTeacherNamesList(listResult.data.teacherNames);
        }
      } else {
        Alert.alert('错误', result.error || '添加失败');
      }
    } catch (error) {
      console.error('Failed to add teacher name:', error);
      Alert.alert('错误', '添加失败，请稍后重试');
    }
  };

  const handleDeleteTeacherName = async (id: number) => {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/teacher-names/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Refresh the list
        const listResponse = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/teacher-names?deviceId=${deviceId}`);
        const listResult = await listResponse.json();
        if (listResponse.ok && listResult.data?.teacherNames) {
          setTeacherNamesList(listResult.data.teacherNames);
        }
      } else {
        Alert.alert('错误', '删除失败');
      }
    } catch (error) {
      console.error('Failed to delete teacher name:', error);
      Alert.alert('错误', '删除失败，请稍后重试');
    }
  };

  const handleRefreshKnowledgePoints = async () => {
    if (!grade || !subject) return;
    
    setRefreshingKnowledgePoints(true);
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/lesson-plans/knowledge-points`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ grade, subject }),
      });

      const result = await response.json();

      if (response.ok && result.data?.knowledgePoints) {
        setKnowledgePointsList(result.data.knowledgePoints);
        // Update local storage
        const storageKey = `knowledge-points-${grade}-${subject}`;
        try {
          await AsyncStorage.setItem(storageKey, JSON.stringify(result.data.knowledgePoints));
        } catch (saveError) {
          console.error('Failed to save to local storage:', saveError);
        }
      }
    } catch (error) {
      console.error('Failed to refresh knowledge points:', error);
      alert('刷新失败，请稍后重试');
    } finally {
      setRefreshingKnowledgePoints(false);
    }
  };

  // Navigate back to home selection
  const handleBackToHome = () => {
    router.navigate('/');
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
                  <FontAwesome6 name="book-open" size={28} color="#FFFFFF" />
                </View>
                <View>
                  <ThemedText variant="h1" color={theme.textPrimary} style={styles.title}>
                    求真学社
                  </ThemedText>
                  <ThemedText variant="body" color={theme.textSecondary} style={styles.subtitle}>
                    智能教案生成助手
                  </ThemedText>
                </View>
              </View>
              {/* Back Button */}
              <TouchableOpacity onPress={handleBackToHome} style={styles.backButton}>
                <FontAwesome6 name="arrow-left" size={20} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>
            <QuoteBanner />
          </ThemedView>

          {/* Form */}
          <View style={styles.formContainer}>
            {/* Teacher Name */}
            <View style={styles.inputGroup}>
              <ThemedText variant="smallMedium" color={theme.textPrimary} style={styles.label}>
                教师姓名
              </ThemedText>
              <TouchableOpacity
                style={[styles.input, styles.selectTrigger]}
                onPress={() => setShowTeacherNamesSelector(true)}
                activeOpacity={0.7}
              >
                <ThemedText
                  variant="body"
                  color={teacherName ? theme.textPrimary : theme.textMuted}
                  style={styles.triggerText}
                >
                  {teacherName || '请选择或输入教师姓名'}
                </ThemedText>
                <FontAwesome6 name="chevron-down" size={16} color={theme.textMuted} />
              </TouchableOpacity>
              {teacherName && (
                <ThemedText variant="caption" color={theme.textMuted} style={styles.hint}>
                  💡 点击可修改姓名
                </ThemedText>
              )}
            </View>

            {/* Grade Selection */}
            <Select
              label="年级"
              value={grade}
              options={GRADES}
              onSelect={setGrade}
              placeholder="请选择年级"
            />

            {/* Subject Selection */}
            <Select
              label="科目"
              value={subject}
              options={SUBJECTS}
              onSelect={setSubject}
              placeholder="请选择科目"
            />

            {/* Knowledge Point Selection */}
            <View style={styles.inputGroup}>
              <ThemedText variant="smallMedium" color={theme.textPrimary} style={styles.label}>
                年级重点知识
              </ThemedText>
              <TouchableOpacity
                style={[styles.input, styles.selectTrigger]}
                onPress={() => {
                  if (!grade || !subject) {
                    alert('请先选择年级和科目');
                    return;
                  }
                  setShowKnowledgePointsSelector(true);
                }}
                activeOpacity={0.7}
              >
                <ThemedText
                  variant="body"
                  color={knowledgePoint ? theme.textPrimary : theme.textMuted}
                  style={styles.triggerText}
                >
                  {loadingKnowledgePoints ? '加载中...' : knowledgePoint || '请选择知识点'}
                </ThemedText>
                <FontAwesome6 name="chevron-down" size={16} color={theme.textMuted} />
              </TouchableOpacity>
              {!knowledgePoint && knowledgePointsList.length > 0 && (
                <ThemedText variant="caption" color={theme.textMuted} style={styles.hint}>
                  💡 已为您推荐{knowledgePointsList.length}个重点知识
                </ThemedText>
              )}
            </View>

            {/* Knowledge Point Input (optional manual input) */}
            <View style={styles.inputGroup}>
              <ThemedText variant="smallMedium" color={theme.textPrimary} style={styles.label}>
                自定义知识点（可选）
              </ThemedText>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="或手动输入其他知识点"
                placeholderTextColor={theme.textMuted}
                value={knowledgePoint}
                onChangeText={setKnowledgePoint}
                multiline
                numberOfLines={2}
              />
            </View>

            {/* Course Objective */}
            <View style={styles.inputGroup}>
              <ThemedText variant="smallMedium" color={theme.textPrimary} style={styles.label}>
                本节课课程目标
              </ThemedText>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="描述希望学生达成的总体目标"
                placeholderTextColor={theme.textMuted}
                value={courseObjective}
                onChangeText={setCourseObjective}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Supplementary Material */}
            <View style={styles.inputGroup}>
              <ThemedText variant="smallMedium" color={theme.textPrimary} style={styles.label}>
                教学补充材料（可选）
              </ThemedText>
              <TextInput
                style={[styles.input, styles.textArea, styles.supplementaryMaterialInput]}
                placeholder="请输入补充的教学材料、案例或要求，AI将参考这些内容生成更贴合的教案"
                placeholderTextColor={theme.textMuted}
                value={supplementaryMaterial}
                onChangeText={setSupplementaryMaterial}
                multiline
                numberOfLines={4}
              />
              
              {/* Upload Image Button */}
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={handlePickImage}
                activeOpacity={0.7}
              >
                <FontAwesome6 name="image" size={16} color={theme.primary} />
                <ThemedText variant="caption" color={theme.primary} style={styles.uploadButtonText}>
                  上传图片（可选）
                </ThemedText>
              </TouchableOpacity>

              {/* Image Preview */}
              {supplementaryImageUri && (
                <View style={styles.imagePreviewContainer}>
                  <View style={styles.imagePreview}>
                    <ThemedView level="default" style={styles.imageWrapper}>
                      <Image
                        source={{ uri: supplementaryImageUri }}
                        style={styles.previewImage}
                        resizeMode="cover"
                      />
                    </ThemedView>
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={handleRemoveImage}
                      activeOpacity={0.7}
                    >
                      <FontAwesome6 name="xmark" size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                  <ThemedText variant="caption" color={theme.textMuted} style={styles.imagePreviewHint}>
                    已选择图片，AI将参考图片内容生成教案
                  </ThemedText>
                </View>
              )}

              {/* Upload File Button */}
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={handlePickFile}
                activeOpacity={0.7}
              >
                <FontAwesome6 name="file-lines" size={16} color={theme.primary} />
                <ThemedText variant="caption" color={theme.primary} style={styles.uploadButtonText}>
                  上传文件（可选）
                </ThemedText>
              </TouchableOpacity>

              {/* File Preview */}
              {supplementaryFile && (
                <View style={styles.filePreviewContainer}>
                  <View style={styles.filePreview}>
                    <View style={styles.fileIconWrapper}>
                      <FontAwesome6 name="file-lines" size={32} color={theme.primary} />
                    </View>
                    <View style={styles.fileInfo}>
                      <ThemedText variant="smallMedium" color={theme.textPrimary} style={styles.fileName}>
                        {supplementaryFile.name}
                      </ThemedText>
                      {supplementaryFile.content && (
                        <ThemedText variant="caption" color={theme.textMuted} style={styles.fileContentPreview}>
                          {supplementaryFile.content.substring(0, 100)}
                          {supplementaryFile.content.length > 100 ? '...' : ''}
                        </ThemedText>
                      )}
                    </View>
                    <TouchableOpacity
                      style={styles.removeFileButton}
                      onPress={handleRemoveFile}
                      activeOpacity={0.7}
                    >
                      <FontAwesome6 name="xmark" size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                  <ThemedText variant="caption" color={theme.textMuted} style={styles.filePreviewHint}>
                    已选择文件，AI将参考文件内容生成教案
                  </ThemedText>
                </View>
              )}
            </View>

            {/* Model Selection */}
            <View style={styles.inputGroup}>
              <ThemedText variant="smallMedium" color={theme.textPrimary} style={styles.label}>
                大语言模型
              </ThemedText>
              <View style={styles.modelOptionsContainer}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.modelOptionsScrollContent}
                >
                  {MODELS.map((m) => (
                    <TouchableOpacity
                      key={m.id}
                      style={[
                        styles.modelOption,
                        model === m.id && styles.modelOptionSelected,
                        model === m.id && { borderColor: theme.primary, backgroundColor: `${theme.primary}10` }
                      ]}
                      onPress={() => setModel(m.id)}
                      activeOpacity={0.7}
                    >
                      <ThemedText variant="caption" color={model === m.id ? theme.primary : theme.textSecondary} style={styles.modelOptionName}>
                        {m.name}
                      </ThemedText>
                      <ThemedText variant="caption" color={model === m.id ? theme.primary : theme.textMuted} style={styles.modelOptionAdvantage}>
                        {m.advantage}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            {/* Lesson Date */}
            <View style={styles.inputGroup}>
              <ThemedText variant="smallMedium" color={theme.textPrimary} style={styles.label}>
                授课日期
              </ThemedText>
              <TouchableOpacity
                style={styles.dateDisplay}
                onPress={handlePressDate}
                activeOpacity={0.7}
              >
                <ThemedText variant="body" color={theme.textSecondary}>
                  {lessonDate}
                </ThemedText>
                <FontAwesome6 name="calendar" size={18} color={theme.primary} style={styles.calendarIcon} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleGenerate}
              activeOpacity={0.7}
            >
              <FontAwesome6 name="wand-magic-sparkles" size={18} color="#FFFFFF" />
              <ThemedText variant="bodyMedium" color="#FFFFFF">
                生成智能教案
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleViewHistory}
              activeOpacity={0.7}
            >
              <FontAwesome6 name="clock-rotate-left" size={18} color={theme.primary} />
              <ThemedText variant="bodyMedium" color={theme.primary}>
                查看历史教案
              </ThemedText>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Teacher Names Selector Modal */}
      <Modal
        visible={showTeacherNamesSelector}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTeacherNamesSelector(false)}
        statusBarTranslucent={true}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <TouchableWithoutFeedback onPress={() => setShowTeacherNamesSelector(false)}>
            <View style={styles.modalOverlay}>
              <TouchableOpacity
                style={styles.modalContent}
                activeOpacity={1}
                onPress={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <ThemedText variant="h4" color={theme.textPrimary}>
                    选择教师姓名
                  </ThemedText>
                  <TouchableOpacity onPress={() => setShowTeacherNamesSelector(false)} activeOpacity={0.7}>
                    <ThemedText variant="h4" color={theme.textMuted}>
                      ✕
                    </ThemedText>
                  </TouchableOpacity>
                </View>
                
                {/* List */}
                {loadingTeacherNames ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.primary} />
                    <ThemedText variant="body" color={theme.textSecondary} style={styles.loadingText}>
                      正在加载历史记录...
                    </ThemedText>
                  </View>
                ) : (
                  <ScrollView style={styles.teacherNamesList}>
                    {teacherNamesList.length === 0 && !customTeacherName ? (
                      <View style={styles.emptyContainer}>
                        <ThemedText variant="body" color={theme.textMuted}>
                          暂无历史记录
                        </ThemedText>
                      </View>
                    ) : (
                      <>
                        {teacherNamesList.map((tn) => (
                          <TouchableOpacity
                            key={tn.id}
                            style={[
                              styles.teacherNameItem,
                              teacherName === tn.teacherName && styles.teacherNameItemSelected,
                              teacherName === tn.teacherName && { borderColor: theme.primary }
                            ]}
                            onPress={() => handleSelectTeacherName(tn)}
                            activeOpacity={0.7}
                          >
                            <ThemedText
                              variant="body"
                              color={teacherName === tn.teacherName ? theme.primary : theme.textPrimary}
                            >
                              {tn.teacherName}
                            </ThemedText>
                            <TouchableOpacity
                              onPress={(e) => {
                                e.stopPropagation();
                                Alert.alert(
                                  '确认删除',
                                  `确定要删除"${tn.teacherName}"吗？`,
                                  [
                                    { text: '取消', style: 'cancel' },
                                    { text: '删除', style: 'destructive', onPress: () => handleDeleteTeacherName(tn.id) }
                                  ]
                                );
                              }}
                              activeOpacity={0.7}
                              style={styles.deleteButton}
                            >
                              <FontAwesome6 name="trash" size={16} color={theme.primary} />
                            </TouchableOpacity>
                          </TouchableOpacity>
                        ))}
                      </>
                    )}
                  </ScrollView>
                )}
                
                {/* Custom input */}
                <View style={styles.customInputContainer}>
                  <TextInput
                    style={[styles.input, styles.customInput]}
                    placeholder="输入新姓名..."
                    placeholderTextColor={theme.textMuted}
                    value={customTeacherName}
                    onChangeText={setCustomTeacherName}
                  />
                  <TouchableOpacity
                    style={[styles.addButton, !customTeacherName.trim() && styles.addButtonDisabled]}
                    onPress={handleAddCustomTeacherName}
                    disabled={!customTeacherName.trim()}
                    activeOpacity={0.7}
                  >
                    <FontAwesome6 name="plus" size={16} color={customTeacherName.trim() ? theme.buttonPrimaryText : theme.textMuted} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* Knowledge Points Selector Modal */}
      <Modal
        visible={showKnowledgePointsSelector}
        transparent
        animationType="fade"
        onRequestClose={() => setShowKnowledgePointsSelector(false)}
        statusBarTranslucent={true}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <TouchableWithoutFeedback onPress={() => setShowKnowledgePointsSelector(false)}>
            <View style={styles.modalOverlay}>
              <TouchableOpacity
                style={styles.modalContent}
                activeOpacity={1}
                onPress={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <View style={styles.modalHeaderLeft}>
                    <ThemedText variant="h4" color={theme.textPrimary}>
                      选择知识点（{grade} - {subject}）
                    </ThemedText>
                  </View>
                  <View style={styles.modalHeaderRight}>
                    {knowledgePointsList.length > 0 && (
                      <TouchableOpacity
                        onPress={handleRefreshKnowledgePoints}
                        disabled={refreshingKnowledgePoints}
                        activeOpacity={0.7}
                        style={styles.refreshButton}
                      >
                        {refreshingKnowledgePoints ? (
                          <ActivityIndicator size="small" color={theme.primary} />
                        ) : (
                          <FontAwesome6 name="rotate" size={16} color={theme.primary} />
                        )}
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={() => setShowKnowledgePointsSelector(false)} activeOpacity={0.7}>
                      <ThemedText variant="h4" color={theme.textMuted}>
                        ✕
                      </ThemedText>
                    </TouchableOpacity>
                  </View>
                </View>
                
                {/* List */}
                {loadingKnowledgePoints ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.primary} />
                    <ThemedText variant="body" color={theme.textSecondary} style={styles.loadingText}>
                      正在加载知识点...
                    </ThemedText>
                  </View>
                ) : (
                  <ScrollView style={styles.knowledgePointsList}>
                    {knowledgePointsList.length === 0 ? (
                      <View style={styles.emptyContainer}>
                        <ThemedText variant="body" color={theme.textMuted}>
                          暂无推荐知识点
                        </ThemedText>
                      </View>
                    ) : (
                      knowledgePointsList.map((kp) => (
                        <TouchableOpacity
                          key={kp.id}
                          style={[
                            styles.knowledgePointItem,
                            knowledgePoint === kp.name && styles.knowledgePointItemSelected,
                            knowledgePoint === kp.name && { borderColor: theme.primary }
                          ]}
                          onPress={() => handleSelectKnowledgePoint(kp)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.knowledgePointContent}>
                            <View style={styles.knowledgePointHeader}>
                              <ThemedText
                                variant="smallMedium"
                                color={knowledgePoint === kp.name ? theme.primary : theme.textPrimary}
                              >
                                {kp.name}
                              </ThemedText>
                              <View style={styles.difficultyBadge}>
                                <ThemedText variant="caption" color={theme.textMuted}>
                                  难度 {kp.difficulty}/5
                                </ThemedText>
                              </View>
                            </View>
                            <ThemedText variant="caption" color={theme.textSecondary} style={styles.knowledgePointDesc}>
                              {kp.description}
                            </ThemedText>
                          </View>
                          {knowledgePoint === kp.name && (
                            <FontAwesome6 name="check" size={20} color={theme.primary} />
                          )}
                        </TouchableOpacity>
                      ))
                    )}
                  </ScrollView>
                )}
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* Date Picker (Mobile Only) */}
      {showDatePicker && Platform.OS !== 'web' && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={handleDateChange}
          minimumDate={new Date(2020, 0, 1)}
          maximumDate={new Date(2030, 11, 31)}
          accentColor="#1678D1"
          // @ts-ignore - androidVariant is supported but not in type definition
          androidVariant="iosClone"
          themeVariant={isDark ? 'dark' : 'light'}
        />
      )}
    </Screen>
  );
}
