import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, ScrollView, Dimensions, Platform, PanResponder, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import { FontAwesome6 } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { ThemedText } from '@/components/ThemedText';
import { EDUCATION_QUOTES } from '@/constants/educationQuotes';
import { createStyles } from './styles';

interface EducationQuoteCarouselProps {
  interval?: number; // 切换间隔（毫秒）
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// 随机打乱数组的函数
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function EducationQuoteCarousel({ interval = 15000 }: EducationQuoteCarouselProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  // 创建随机打乱的金句索引数组
  const shuffledIndices = useMemo(() => {
    const indices = Array.from({ length: EDUCATION_QUOTES.length }, (_, i) => i);
    return shuffleArray(indices);
  }, []);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInteracting, setUserInteracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const autoScrollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const cardRefs = useRef<Record<number, View>>({});
  
  // 保存金句卡片到相册
  const handleSaveQuote = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('提示', '网页端暂不支持保存功能，请使用移动端App。');
      return;
    }

    try {
      setSaving(true);

      // 检查媒体库权限
      const { status } = await MediaLibrary.getPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('权限提示', '需要相册权限才能保存金句卡片，请在设置中允许访问相册。');
        setSaving(false);
        return;
      }

      // 截取当前卡片
      const cardRef = cardRefs.current[currentIndex];
      if (!cardRef) {
        Alert.alert('提示', '无法获取卡片内容，请稍后再试。');
        setSaving(false);
        return;
      }

      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1,
      });

      // 保存到相册
      await MediaLibrary.createAssetAsync(uri);

      Alert.alert('保存成功', '金句卡片已保存到您的相册。');
    } catch (error) {
      console.error('保存金句卡片失败:', error);
      Alert.alert('保存失败', '保存金句卡片时发生错误，请稍后再试。');
    } finally {
      setSaving(false);
    }
  };
  
  // 重置自动滚动计时器
  const resetAutoScroll = () => {
    if (autoScrollTimerRef.current) {
      clearInterval(autoScrollTimerRef.current);
    }
    
    // 如果用户正在交互，不启动自动滚动
    if (userInteracting) return;

    autoScrollTimerRef.current = setInterval(() => {
      const nextIndex = (currentIndex + 1) % shuffledIndices.length;
      setCurrentIndex(nextIndex);
      scrollViewRef.current?.scrollTo({
        x: nextIndex * SCREEN_WIDTH,
        animated: true,
      });
    }, interval);
    
    return () => {
      if (autoScrollTimerRef.current) {
        clearInterval(autoScrollTimerRef.current);
      }
    };
  };

  // 初始化自动切换
  useEffect(() => {
    const cleanup = resetAutoScroll();
    return cleanup;
  }, [currentIndex, interval, userInteracting]);

  // 手动切换
  const handleScroll = (event: any) => {
    const x = event.nativeEvent.contentOffset.x;
    const index = Math.round(x / SCREEN_WIDTH);
    if (index !== currentIndex && index >= 0 && index < shuffledIndices.length) {
      setCurrentIndex(index);
    }
  };

  // 移动端触摸支持（使用PanResponder）
  const panResponder = useMemo(() => {
    const handlers = PanResponder.create({
      onStartShouldSetPanResponder: () => Platform.OS !== 'web',
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Platform.OS !== 'web' && Math.abs(gestureState.dx) > 5;
      },
      onPanResponderGrant: () => {
        setUserInteracting(true);
      },
      onPanResponderRelease: () => {
        setUserInteracting(false);
      },
    });
    return handlers;
  }, []);

  // Web端鼠标滚轮和拖动支持
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    let isDragging = false;
    let startX = 0;
    let currentScrollX = 0;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      
      const deltaX = event.deltaX || event.deltaY;
      const container = scrollContainerRef.current;
      
      if (container) {
        currentScrollX = container.scrollLeft;
        const newScrollX = Math.max(0, Math.min(currentScrollX + deltaX, (shuffledIndices.length - 1) * SCREEN_WIDTH));
        container.scrollLeft = newScrollX;

        // 更新当前索引
        const newIndex = Math.round(newScrollX / SCREEN_WIDTH);
        if (newIndex !== currentIndex && newIndex >= 0 && newIndex < shuffledIndices.length) {
          setCurrentIndex(newIndex);
        }
      }
    };

    const handleMouseDown = (event: MouseEvent) => {
      isDragging = true;
      startX = event.clientX;
      currentScrollX = scrollContainerRef.current?.scrollLeft || 0;
      setUserInteracting(true);
      document.body.style.cursor = 'grabbing';
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!isDragging) return;
      
      const deltaX = event.clientX - startX;
      const container = scrollContainerRef.current;
      
      if (container) {
        const newScrollX = Math.max(0, Math.min(currentScrollX - deltaX, (shuffledIndices.length - 1) * SCREEN_WIDTH));
        container.scrollLeft = newScrollX;
      }
    };

    const handleMouseUp = () => {
      if (isDragging) {
        isDragging = false;
        document.body.style.cursor = '';
        setUserInteracting(false);
        
        const container = scrollContainerRef.current;
        if (container) {
          const finalScrollX = container.scrollLeft;
          const newIndex = Math.round(finalScrollX / SCREEN_WIDTH);
          
          // 滚动到最近的页面
          const targetX = newIndex * SCREEN_WIDTH;
          container.scrollTo({
            left: targetX,
            behavior: 'smooth'
          });
          
          setCurrentIndex(newIndex);
        }
      }
    };

    const timer = setTimeout(() => {
      const container = scrollContainerRef.current;
      if (container) {
        container.addEventListener('wheel', handleWheel, { passive: false });
        container.addEventListener('mousedown', handleMouseDown);
        container.addEventListener('mousemove', handleMouseMove);
        container.addEventListener('mouseup', handleMouseUp);
        container.addEventListener('mouseleave', handleMouseUp);
        container.style.cursor = 'grab';
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      const container = scrollContainerRef.current;
      if (container) {
        container.removeEventListener('wheel', handleWheel);
        container.removeEventListener('mousedown', handleMouseDown);
        container.removeEventListener('mousemove', handleMouseMove);
        container.removeEventListener('mouseup', handleMouseUp);
        container.removeEventListener('mouseleave', handleMouseUp);
      }
    };
  }, [currentIndex]);

  return (
    <View style={styles.container}>
      {/* 保存按钮 */}
      {Platform.OS !== 'web' && (
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSaveQuote}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <FontAwesome6 name="download" size={16} color="#fff" />
              <ThemedText variant="captionMedium" style={styles.saveButtonText}>
                保存金句
              </ThemedText>
            </>
          )}
        </TouchableOpacity>
      )}
      
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        {...(Platform.OS !== 'web' && panResponder.panHandlers)}
      >
        {shuffledIndices.map((quoteIndex, index) => {
          const quote = EDUCATION_QUOTES[quoteIndex];
          return (
          <View 
            key={index} 
            style={styles.slide}
            {...(Platform.OS === 'web' && {
              onLayout: () => {
                // Web端：设置ref以便后续访问DOM元素
                if (index === 0) {
                  setTimeout(() => {
                    const scrollViewNode = scrollViewRef.current?.getScrollableNode?.();
                    if (scrollViewNode) {
                      scrollContainerRef.current = scrollViewNode as unknown as HTMLDivElement;
                    }
                  }, 100);
                }
              }
            })}
          >
            <View
              ref={(ref) => { if (ref) cardRefs.current[index] = ref; }}
              style={styles.quoteCard}
            >
              {/* 理论标签 */}
              <View style={styles.theoryTag}>
                <ThemedText variant="captionMedium" style={styles.theoryText}>
                  {quote.theory}
                </ThemedText>
              </View>
              
              {/* 卡片内容 */}
              <View style={styles.cardBody}>
                <ThemedText variant="body" style={styles.quoteText}>
                  &ldquo;{quote.quote}&rdquo;
                </ThemedText>
                
                {/* 实践案例 */}
                <View style={styles.caseStudyBox}>
                  <ThemedText variant="caption" style={styles.caseStudyLabel}>
                    实践案例
                  </ThemedText>
                  <ThemedText variant="small" style={styles.caseStudyText}>
                    {quote.caseStudy}
                  </ThemedText>
                </View>
              </View>
            </View>
          </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
