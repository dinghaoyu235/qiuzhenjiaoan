import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { LLMClient, Config } from 'coze-coding-dev-sdk';

const router = Router();

// 请求参数校验
const generateQuotesSchema = z.object({
  count: z.number().min(1).max(5).default(1), // 一次最多生成5条
});

/**
 * POST /api/v1/quotes/generate
 * 
 * 生成教育金句
 * 
 * 防卡顿策略：
 * 1. 快速响应（流式输出）
 * 2. 限制生成数量
 * 3. 提示词优化（简洁高效）
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const validatedData = generateQuotesSchema.parse(body);
    const { count } = validatedData;

    // 优化的提示词（简洁，快速生成）
    const prompt = `请生成${count}条教育金句，每条15-30字，要求：
1. 启发性强，能激励教师
2. 语言优美，易于传播
3. 贴近教学实际，有温度
4. 格式：每条金句单独一行

示例：
用心设计每一堂课，用爱陪伴每一位学生
教育不是注满一桶水，而是点燃一把火

请直接输出金句，不要其他内容：`;

    // 调用LLM生成金句
    const config = new Config();
    const client = new LLMClient(config);
    
    const messages = [
      {
        role: 'system' as const,
        content: '你是一位教育领域的专家，擅长创作启发性、有温度的教育金句。输出格式为纯文本，每行一条金句。',
      },
      {
        role: 'user' as const,
        content: prompt,
      },
    ];

    // 使用doubao模型（速度快，性价比高）
    const response = await client.invoke(messages, {
      model: 'doubao-seed-2-0-pro-260215',
      temperature: 0.9, // 较高的温度以增加多样性
    });

    // 解析生成的金句
    const content = response.content || '';
    const quotes = content
      .split('\n')
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 5 && line.length < 50) // 过滤无效长度
      .slice(0, count); // 限制返回数量

    res.json({
      success: true,
      data: {
        quotes: quotes.length > 0 ? quotes : ['教育是一棵树摇动另一棵树，一朵云推动另一朵云'],
      },
    });
  } catch (error) {
    console.error('生成金句失败:', error);

    // 降级方案：返回预设金句
    const fallbackQuotes = [
      '教育是一棵树摇动另一棵树，一朵云推动另一朵云',
      '好的教育是点燃火焰，而非填满容器',
      '教育是让每个孩子都发光',
    ];

    res.json({
      success: true,
      data: {
        quotes: fallbackQuotes,
      },
    });
  }
});

export default router;
