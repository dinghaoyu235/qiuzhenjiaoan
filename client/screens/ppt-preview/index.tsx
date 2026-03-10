import React, { useState, useMemo } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Platform,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { FontAwesome6 } from '@expo/vector-icons';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { createStyles } from './styles';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SLIDE_ASPECT_RATIO = 16 / 9;

type PPTSlide = {
  slideNumber: number;
  slideType: string;
  title: string;
  content: any[];
  layout: string;
  animation: string;
  notes: string;
  imageUrl?: string;
};

type PPTStructure = {
  metadata: any;
  slides: PPTSlide[];
  designGuidance: any;
};

export default function PPTPreviewScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();
  const params = useSafeSearchParams<{ pptData?: string }>();

  const [pptData, setPptData] = useState<PPTStructure | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [selectedSubject, setSelectedSubject] = useState<string>('全部');
  const [exporting, setExporting] = useState(false);

  // Parse PPT data from params
  React.useEffect(() => {
    console.log('[PPTPreview] useEffect triggered, params.pptData:', !!params.pptData);
    console.log('[PPTPreview] params.pptData length:', params.pptData?.length || 0);
    
    if (params.pptData) {
      try {
        console.log('[PPTPreview] Starting to parse PPT data...');
        const data = JSON.parse(params.pptData);
        console.log('[PPTPreview] Parsed PPT data:', {
          hasMetadata: !!data.metadata,
          hasSlides: !!data.slides,
          slidesCount: data.slides?.length || 0,
          hasDesignGuidance: !!data.designGuidance,
        });
        setPptData(data);
      } catch (error) {
        console.error('[PPTPreview] Failed to parse PPT data:', error);
        Alert.alert('错误', 'PPT 数据解析失败');
      }
    }
  }, [params.pptData]);

  // Navigate back
  const handleBack = () => {
    router.back();
  };

  // Handle slide selection
  const handleSlideSelect = (index: number) => {
    setCurrentSlideIndex(index);
  };

  // Navigate to next slide
  const handleNextSlide = () => {
    if (pptData && currentSlideIndex < pptData.slides.length - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1);
    }
  };

  // Navigate to previous slide
  const handlePreviousSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(currentSlideIndex - 1);
    }
  };

  // Export PPT
  const handleExportPPT = async (format: 'pptx' | 'pdf') => {
    if (!pptData) {
      return;
    }

    setExporting(true);
    try {
      Alert.alert('提示', `正在生成 ${format.toUpperCase()} 文件...`);
      
      /**
       * 服务端文件：server/src/routes/ppt-generation.ts
       * 接口：POST /api/v1/ppt/export
       * Body 参数：pptStructure: object, exportFormat: string
       */
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/ppt/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pptStructure: pptData,
          exportFormat: format,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[PPT Export] Server error:', errorText);
        Alert.alert('错误', `导出失败: ${response.status} ${response.statusText}`);
        return;
      }

      // Get file buffer
      const buffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(buffer);
      console.log('[PPT Export] Received buffer, size:', uint8Array.length);

      // Convert to base64
      const base64 = btoa(
        uint8Array.reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      // Generate filename
      const filename = `${pptData.metadata?.title || 'presentation'}_${Date.now()}.${format}`;

      // Write to file
      const fileUri = `${(FileSystem as any).documentDirectory}${filename}`;
      console.log('[PPT Export] Writing to file:', fileUri);
      
      await (FileSystem as any).writeAsStringAsync(
        fileUri,
        base64,
        { encoding: (FileSystem as any).EncodingType.Base64 }
      );

      console.log('[PPT Export] File saved successfully');

      // Share or open file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: format === 'pptx' 
            ? 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
            : 'application/pdf',
          dialogTitle: `导出 ${format.toUpperCase()} 文件`,
        });
      } else {
        Alert.alert('成功', `文件已保存到: ${fileUri}`);
      }

    } catch (error) {
      console.error('[PPT Export] Export error:', error);
      Alert.alert('错误', `导出失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setExporting(false);
    }
  };

  // Render slide content based on type
  const renderSlideContent = (slide: PPTSlide) => {
    const designGuidance = pptData?.designGuidance || {};

    // If slide has imageUrl, display the image directly
    if (slide.imageUrl) {
      return (
        <View style={styles.slideContent}>
          <Image
            source={{ uri: slide.imageUrl }}
            style={styles.slideImage}
            resizeMode="contain"
          />
          {/* Slide Number */}
          <View style={styles.slideFooter}>
            <ThemedText variant="caption" color={theme.textMuted}>
              {slide.slideNumber} / {pptData?.slides.length || 0}
            </ThemedText>
          </View>
        </View>
      );
    }

    // Fallback to text-based rendering if no image
    return (
      <View style={styles.slideContent}>
        {/* Title */}
        {slide.title && (
          <ThemedText variant="h2" color={theme.textPrimary} style={styles.slideTitle}>
            {slide.title}
          </ThemedText>
        )}

        {/* Content */}
        <View style={styles.slideBody}>
          {slide.content.map((item, index) => {
            if (item.type === 'heading') {
              return (
                <ThemedText
                  key={index}
                  variant="h3"
                  color={theme.textPrimary}
                  style={[item.emphasis && styles.emphasis]}
                >
                  {item.text}
                </ThemedText>
              );
            } else if (item.type === 'bullet') {
              return (
                <View key={index} style={styles.bulletItem}>
                  <View style={[styles.bulletPoint, { backgroundColor: designGuidance.primaryColor }]} />
                  <ThemedText
                    variant="body"
                    color={theme.textPrimary}
                    style={[item.emphasis && styles.emphasis]}
                  >
                    {item.text}
                  </ThemedText>
                </View>
              );
            } else if (item.type === 'image') {
              return (
                <View key={index} style={styles.imagePlaceholder}>
                  <FontAwesome6 name="image" size={48} color={theme.textMuted} />
                  <ThemedText variant="caption" color={theme.textMuted} style={styles.imagePlaceholderText}>
                    {item.imageUrl || '图片占位符'}
                  </ThemedText>
                </View>
              );
            } else if (item.type === 'question') {
              return (
                <View key={index} style={styles.questionBox}>
                  <ThemedText variant="h4" color={theme.textPrimary}>
                    💭 {item.text}
                  </ThemedText>
                </View>
              );
            }
            return null;
          })}
        </View>

        {/* Slide Number */}
        <View style={styles.slideFooter}>
          <ThemedText variant="caption" color={theme.textMuted}>
            {slide.slideNumber} / {pptData?.slides.length || 0}
          </ThemedText>
        </View>
      </View>
    );
  };

  // Get filtered slides
  const getFilteredSlides = () => {
    if (!pptData) return [];
    // You can add filtering logic here based on slide type
    return pptData.slides;
  };

  if (!pptData) {
    return (
      <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={theme.primary} size="large" />
          <ThemedText variant="body" color={theme.textSecondary} style={styles.loadingText}>
            加载中...
          </ThemedText>
        </View>
      </Screen>
    );
  }

  const filteredSlides = getFilteredSlides();
  const currentSlide = filteredSlides[currentSlideIndex];
  const designGuidance = pptData.designGuidance || {};

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      {/* Header */}
      <ThemedView level="root" style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <FontAwesome6 name="arrow-left" size={20} color={theme.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <ThemedText variant="h3" color={theme.textPrimary}>
            PPT 预览
          </ThemedText>
          <ThemedText variant="caption" color={theme.textSecondary}>
            {pptData.metadata?.title || '未命名演示文稿'}
          </ThemedText>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.exportIcon}
            onPress={() => handleExportPPT('pptx')}
            disabled={exporting}
          >
            {exporting ? (
              <ActivityIndicator color={theme.primary} size="small" />
            ) : (
              <FontAwesome6 name="file-powerpoint" size={20} color={theme.primary} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.exportIcon}
            onPress={() => handleExportPPT('pdf')}
            disabled={exporting}
          >
            {exporting ? (
              <ActivityIndicator color={theme.primary} size="small" />
            ) : (
              <FontAwesome6 name="file-pdf" size={20} color={theme.textMuted} />
            )}
          </TouchableOpacity>
        </View>
      </ThemedView>

      {/* Main Content */}
      <View style={styles.mainContent}>
        {/* Slide Preview (Main) */}
        <View style={styles.slidePreviewContainer}>
          <View
            style={[
              styles.slideCard,
              {
                backgroundColor: designGuidance.backgroundStyle || theme.backgroundDefault,
                borderColor: designGuidance.primaryColor || theme.border,
              },
            ]}
          >
            {renderSlideContent(currentSlide)}
          </View>

          {/* Navigation Controls */}
          <View style={styles.navigationControls}>
            <TouchableOpacity
              style={[styles.navButton, currentSlideIndex === 0 && styles.navButtonDisabled]}
              onPress={handlePreviousSlide}
              disabled={currentSlideIndex === 0}
            >
              <FontAwesome6
                name="chevron-left"
                size={24}
                color={currentSlideIndex === 0 ? theme.textMuted : theme.textPrimary}
              />
            </TouchableOpacity>
            <ThemedText variant="caption" color={theme.textSecondary}>
              {currentSlideIndex + 1} / {filteredSlides.length}
            </ThemedText>
            <TouchableOpacity
              style={[
                styles.navButton,
                currentSlideIndex === filteredSlides.length - 1 && styles.navButtonDisabled,
              ]}
              onPress={handleNextSlide}
              disabled={currentSlideIndex === filteredSlides.length - 1}
            >
              <FontAwesome6
                name="chevron-right"
                size={24}
                color={currentSlideIndex === filteredSlides.length - 1 ? theme.textMuted : theme.textPrimary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Slide Thumbnails */}
        <View style={styles.thumbnailsContainer}>
          <ThemedText variant="label" color={theme.textPrimary} style={styles.thumbnailsTitle}>
            幻灯片列表
          </ThemedText>
          <View style={styles.thumbnailsScrollWrapper}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbnailsScroll}>
              {filteredSlides.map((slide, index) => (
                <TouchableOpacity
                  key={slide.slideNumber}
                  style={[
                    styles.thumbnail,
                    currentSlideIndex === index && styles.thumbnailActive,
                    {
                      borderColor:
                        currentSlideIndex === index ? designGuidance.primaryColor || theme.primary : theme.border,
                    },
                  ]}
                  onPress={() => handleSlideSelect(index)}
                >
                  <View
                    style={[
                      styles.thumbnailInner,
                      {
                        backgroundColor: designGuidance.backgroundStyle || theme.backgroundDefault,
                      },
                    ]}
                  >
                    <ThemedText
                      variant="caption"
                      color={theme.textPrimary}
                      style={styles.thumbnailNumber}
                    >
                      {index + 1}
                    </ThemedText>
                    <ThemedText
                      variant="caption"
                      color={theme.textSecondary}
                      style={styles.thumbnailTitle}
                      numberOfLines={2}
                    >
                      {slide.title}
                    </ThemedText>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </View>
    </Screen>
  );
}
