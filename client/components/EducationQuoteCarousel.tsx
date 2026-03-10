import React from 'react';
import { QuoteBanner } from './QuoteBanner';

/**
 * 教育金句轮播组件（兼容别名）
 * 
 * 这是 QuoteBanner 的别名，用于保持向后兼容
 * 
 * 在预览页面加载时显示，使用大语言模型实时生成教育金句
 */
export default function EducationQuoteCarousel({ interval }: { interval?: number }) {
  // QuoteBanner 内部已经有防卡顿策略，直接使用即可
  // interval 参数暂时不使用，因为 QuoteBanner 固定为 15 秒
  return <QuoteBanner />;
}
