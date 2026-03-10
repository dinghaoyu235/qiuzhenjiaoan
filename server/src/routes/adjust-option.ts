import express, { type Request, type Response } from "express";
import { LLMClient, Config } from "coze-coding-dev-sdk";

const router = express.Router();

// Helper function to get appropriate temperature for model
function getModelTemperature(model: string, defaultTemp: number = 0.7): number {
  // Kimi K2.5 only supports temperature 0.6
  if (model === 'kimi-k2-5-260127') {
    return 0.6;
  }
  return defaultTemp;
}

interface AdjustOptionRequest {
  teacherName: string;
  grade: string;
  subject: string;
  knowledgePoint: string;
  courseObjective: string;
  optionType: 'intro' | 'activity' | 'summary';
  optionTitle: string;
  optionDescription: string;
  optionRationale: string;
  adjustmentRequest: string;
  model?: string;
}

interface AdjustedOption {
  title: string;
  description: string;
  rationale: string;
}

// POST /api/v1/lesson-plans/adjust-option - Adjust a specific option using LLM
router.post("/adjust-option", async (req: Request, res: Response) => {
  try {
    const body: AdjustOptionRequest = req.body;

    // Validate required fields
    if (
      !body.teacherName ||
      !body.grade ||
      !body.subject ||
      !body.knowledgePoint ||
      !body.courseObjective ||
      !body.optionType ||
      !body.optionTitle ||
      !body.optionDescription ||
      !body.optionRationale ||
      !body.adjustmentRequest
    ) {
      return res.status(400).json({
        error: "Missing required fields",
      });
    }

    console.log("Adjusting option:", {
      type: body.optionType,
      teacher: body.teacherName,
      adjustment: body.adjustmentRequest,
    });

    const config = new Config();
    const client = new LLMClient(config);

    const model = body.model || "doubao-seed-2-0-pro-260215";

    // Determine option type label
    const optionTypeLabel = {
      intro: '导入阶段（5-10分钟）',
      activity: '课堂活动（40-45分钟）',
      summary: '总结阶段（10-15分钟）'
    }[body.optionType];

    const prompt = `你是一位专业的教学设计师，帮助教师调整${optionTypeLabel}的活动设计。

## 基本信息
教师姓名：${body.teacherName}
年级：${body.grade}
科目：${body.subject}
知识点：${body.knowledgePoint}
课程目标：${body.courseObjective}

## 当前活动设计
标题：${body.optionTitle}
简要说明：${body.optionDescription}
设计理念：${body.optionRationale}

## 教师的调整需求
${body.adjustmentRequest}

## 要求

请根据教师的调整需求，对活动设计进行优化调整，调整后的方案必须：

1. **符合需求**：完全满足教师提出的调整要求
2. **保持理念**：继续符合维果茨基的最近发展区、布鲁姆教学目标分类、人本主义、信息处理理论等教育理念
3. **保持时长**：保持在${optionTypeLabel}的时间范围内
4. **具体可行**：调整后的方案要具体、可操作
5. **不改变本质**：调整应该是优化，而不是完全改变活动类型
6. **简洁表达**：description和rationale都限制在四句话以内，每句话不超过25个字

## 输出格式

请严格按照以下JSON格式输出（确保JSON格式正确，不要添加任何额外文本）：

{
  "title": "调整后的活动标题（4-6字）",
  "description": "调整后的活动简要说明，不超过四句话，每句25字以内",
  "rationale": "调整后的设计理念说明，不超过四句话，每句25字以内"
}

**重要提示**：
- 确保返回的JSON格式完全正确
- 标题要简洁有力，4-6个字
- description和rationale都必须严格控制在四句话以内，每句话不超过25个字
- 描述要具体但不冗长
- 设计理念要体现教育专业性`;

    const messages = [
      {
        role: "system" as const,
        content: "你是一位专业的教学设计师，擅长运用维果茨基的最近发展区理论、布鲁姆教学目标分类、人本主义和信息处理理论设计教案。输出必须是有效的JSON格式。",
      },
      {
        role: "user" as const,
        content: prompt,
      },
    ];

    const response = await client.invoke(messages, {
      model,
      temperature: getModelTemperature(model, 0.7),
    });

    // Extract JSON from response
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to extract JSON from LLM response");
    }

    const result = JSON.parse(jsonMatch[0]);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error adjusting option:", error);
    res.status(500).json({
      error: "Failed to adjust option",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
