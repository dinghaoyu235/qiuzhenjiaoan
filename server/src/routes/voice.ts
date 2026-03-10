import { Router } from 'express';
import type { Request, Response } from 'express';
import { ASRClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

const router = Router();

/**
 * POST /api/v1/voice/recognize
 * 语音识别接口（ASR）
 * Body 参数：base64Data: string (base64编码的音频数据)
 */
router.post('/recognize', async (req: Request, res: Response) => {
  try {
    const { base64Data } = req.body;

    if (!base64Data) {
      return res.status(400).json({ error: '缺少音频数据' });
    }

    // 提取请求头并传递给SDK
    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers as Record<string, string>);

    // 创建ASR客户端
    const config = new Config();
    const client = new ASRClient(config, customHeaders);

    // 识别语音
    const result = await client.recognize({
      uid: 'lesson-plan-user',
      base64Data,
    });

    res.json({
      success: true,
      text: result.text,
      duration: result.duration,
    });
  } catch (error) {
    console.error('语音识别失败:', error);
    res.status(500).json({
      error: '语音识别失败',
      message: error instanceof Error ? error.message : '未知错误',
    });
  }
});

export default router;
