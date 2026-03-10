import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/hooks/useTheme';
import { ThemedText } from '@/components/ThemedText';

// 预设金句列表（避免冷启动时为空）
const DEFAULT_QUOTES = [
  '让教案创作更高效，让教学更有温度',
  '用心设计每一堂课，用爱陪伴每一位学生',
  '教育不是注满一桶水，而是点燃一把火',
  '好的教案是教师智慧的结晶，更是学生成长的阶梯',
  '在教育之路上，每一份精心设计都意义非凡',
];

interface QuoteBannerProps {
  style?: any;
}

/**
 * 智能金句轮播组件
 * 
 * 特性：
 * - 定时轮播金句（默认15秒切换）
 * - 后台异步调用LLM生成新金句
 * - 使用缓存机制减少API调用
 * - 淡入淡出动画效果
 * - 智能换行（删除逗号，在原逗号位置换行）
 * - 防卡顿策略（节流、缓存、降级、超时、延迟）
 * 
 * 防卡顿优化：
 * - 每5次轮播才生成一次新金句（更激进的节流）
 * - 请求超时5秒自动取消
 * - 生成延迟2秒，避免动画冲突
 * - 最大缓存20条，避免内存占用过大
 * - 静默失败，完全不影响用户体验
 */
export const QuoteBanner = ({ style }: QuoteBannerProps) => {
  const { theme } = useTheme();

  // 当前显示的金句
  const [currentQuote, setCurrentQuote] = useState<string>(DEFAULT_QUOTES[0]);
  // 金句列表（包含预设和生成的）
  const [quotes, setQuotes] = useState<string[]>(DEFAULT_QUOTES);
  // 当前索引
  const [currentIndex, setCurrentIndex] = useState(0);
  // 是否正在生成
  const [isGenerating, setIsGenerating] = useState(false);

  // 动画相关
  const fadeAnim = useRef(new Animated.Value(1)).current;

  /**
   * 淡入效果
   */
  const fadeIn = useCallback(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      easing: Easing.ease,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  /**
   * 淡出效果
   */
  const fadeOut = useCallback(() => {
    return new Promise<void>((resolve) => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        easing: Easing.ease,
        useNativeDriver: true,
      }).start(() => resolve());
    });
  }, [fadeAnim]);

  /**
   * 切换到下一条金句
   */
  const switchToNextQuote = useCallback(async () => {
    await fadeOut();
    
    const nextIndex = (currentIndex + 1) % quotes.length;
    setCurrentIndex(nextIndex);
    setCurrentQuote(quotes[nextIndex]);
    
    fadeIn();
  }, [currentIndex, quotes, fadeOut, fadeIn]);

/**
 * 调用大语言模型生成新金句
 * 
 * 防卡顿策略：
 * 1. 节流：每次轮播不一定都生成新金句
 * 2. 缓存：已生成的金句会存储在本地
 * 3. 降级：API调用失败时继续使用预设金句
 * 4. 异步：不影响UI渲染
 * 5. 超时：请求超时自动取消，避免长时间占用资源
 * 6. 延迟：使用较长的延迟，分散请求时间
 */
const generateNewQuote = useCallback(async () => {
  // 防止并发生成
  if (isGenerating) return;
  
  // 只在金句列表较小时才生成（避免无限增长）
  if (quotes.length > 20) return;
  
  setIsGenerating(true);
  
  // 创建 AbortController 用于超时取消
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时
  
  try {
    const response = await fetch(
      `${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/quotes/generate`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: 1 }),
        signal: controller.signal, // 支持取消请求
      }
    );

    clearTimeout(timeoutId);

    if (response.ok) {
      const result = await response.json();
      if (result.data?.quotes && result.data.quotes.length > 0) {
        const newQuote = result.data.quotes[0];
        
        // 避免重复
        if (!quotes.includes(newQuote)) {
          setQuotes((prev) => [...prev, newQuote]);
        }
      }
    }
  } catch (error) {
    console.error('生成金句失败:', error);
    // 失败时静默处理，不影响用户体验
  } finally {
    clearTimeout(timeoutId);
    setIsGenerating(false);
  }
}, [quotes, isGenerating]);

  /**
   * 轮播定时器
   * 
   * 优化策略：
   * - 15秒切换一次，给用户充足的阅读时间
   * - 每5次轮播才尝试生成一次新金句（更激进的节流）
   * - 生成延迟2秒，避免与轮播动画冲突
   */
  useEffect(() => {
    const interval = setInterval(async () => {
      await switchToNextQuote();
      
      // 每5次轮播才尝试生成一次新金句（更激进的节流）
      // 这样既保证有新内容，又大幅减少API调用频率
      if (quotes.length < 10 && currentIndex % 5 === 0) {
        // 延迟生成，避免与轮播动画冲突
        setTimeout(() => {
          generateNewQuote();
        }, 2000);
      }
    }, 15000); // 每15秒切换一次

    return () => clearInterval(interval);
  }, [switchToNextQuote, quotes, currentIndex, generateNewQuote]);

  /**
   * 页面加载时尝试从缓存加载历史金句
   */
  useEffect(() => {
    const loadCachedQuotes = async () => {
      try {
        const cached = await AsyncStorage.getItem('cached-quotes');
        if (cached) {
          const cachedQuotes = JSON.parse(cached);
          if (Array.isArray(cachedQuotes) && cachedQuotes.length > 0) {
            setQuotes(cachedQuotes);
            setCurrentQuote(cachedQuotes[0]);
          }
        }
      } catch (error) {
        console.error('加载缓存金句失败:', error);
      }
    };

    loadCachedQuotes();
  }, []);

  /**
   * 当金句列表更新时保存到缓存
   */
  useEffect(() => {
    const saveQuotesToCache = async () => {
      try {
        // 只保存最近的20条，避免存储过大
        const quotesToSave = quotes.slice(-20);
        await AsyncStorage.setItem('cached-quotes', JSON.stringify(quotesToSave));
      } catch (error) {
        console.error('保存金句缓存失败:', error);
      }
    };

    if (quotes.length > DEFAULT_QUOTES.length) {
      saveQuotesToCache();
    }
  }, [quotes]);

  /**
   * 格式化金句：删除逗号并智能换行
   * 
   * 规则：
   * - 删除所有逗号
   * - 如果金句长度超过15个字符，在原始逗号位置换行
   * - 如果金句长度超过30个字符，在第二个原始逗号位置也换行
   * - 最多换行2次（共3行）
   */
  const formatQuote = useCallback((quote: string): string => {
    // 先去除所有逗号
    const cleanQuote = quote.replace(/[,，]/g, '');
    
    // 如果金句较短，不需要换行
    if (cleanQuote.length <= 15) {
      return cleanQuote;
    }

    // 按逗号位置分割原始文本
    const parts = quote.split(/[,，]/);
    
    if (parts.length === 1) {
      // 没有逗号，返回清理后的文本
      return cleanQuote;
    }

    // 如果只有两部分，在逗号位置换行（不带逗号）
    if (parts.length === 2) {
      return parts[0] + '\n' + parts[1];
    }

    // 如果有多个逗号，根据长度决定换行次数
    let result = parts[0];
    
    // 第一行：在第一个逗号位置换行
    result += '\n' + parts[1];
    
    // 如果金句较长，在第二个逗号位置也换行
    if (cleanQuote.length > 30 && parts.length > 2) {
      result += '\n' + parts[2];
      
      // 剩余部分继续追加
      if (parts.length > 3) {
        result += parts.slice(3).join('');
      }
    } else if (parts.length > 2) {
      // 金句不太长，剩余部分合并到第二行
      result += parts.slice(2).join('');
    }

    return result;
  }, []);

  const formattedQuote = formatQuote(currentQuote);

  const styles = StyleSheet.create({
    container: {
      backgroundColor: theme.primary,
      marginHorizontal: 20,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 16,
      boxShadow: '0px 4px 12px rgba(22, 120, 209, 0.2)',
    },
    textContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 40, // 确保有多行时容器高度足够
    },
    quoteText: {
      fontSize: 15,
      fontWeight: '500',
      textAlign: 'center',
      color: '#FFFFFF',
      lineHeight: 24, // 增加行高，使多行文本更美观
    },
  });

  return (
    <View style={[styles.container, style]}>
      <Animated.View style={styles.textContainer}>
        <ThemedText variant="body" color="#FFFFFF" style={styles.quoteText}>
          {formattedQuote}
        </ThemedText>
      </Animated.View>
    </View>
  );
};
