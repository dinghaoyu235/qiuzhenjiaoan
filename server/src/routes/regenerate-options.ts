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

interface RegenerateOptionsRequest {
  teacherName: string;
  grade: string;
  subject: string;
  knowledgePoint: string;
  courseObjective: string;
  lessonDate: string;
  type: 'intro' | 'activity' | 'summary';
  model?: string;
}

// POST /api/v1/lesson-plans/regenerate-options - Regenerate options for a specific section
router.post("/regenerate-options", async (req: Request, res: Response) => {
  try {
    const body: RegenerateOptionsRequest = req.body;

    // Validate required fields
    if (
      !body.teacherName ||
      !body.grade ||
      !body.subject ||
      !body.knowledgePoint ||
      !body.courseObjective ||
      !body.lessonDate ||
      !body.type
    ) {
      return res.status(400).json({
        error: "Missing required fields",
      });
    }

    console.log("Regenerating options for:", { type: body.type, teacher: body.teacherName });

    const config = new Config();
    const client = new LLMClient(config);

    const model = body.model || "doubao-seed-2-0-pro-260215";

    // Generate different prompt based on type
    let prompt = "";
    let optionsKey = "";

    if (body.type === 'intro') {
      optionsKey = "introOptions";
      prompt = `你是一位专业的教学设计师，为"求真学社"重新生成导入环节的5个新选项。

## 基本信息
教师姓名：${body.teacherName}
年级：${body.grade}
科目：${body.subject}
知识点：${body.knowledgePoint}
课程目标：${body.courseObjective}

请严格按照以下格式生成JSON（必须确保JSON格式正确，不要添加任何额外文本）：

{
  "options": [
    {
      "id": 1,
      "title": "选项标题（4-6字）",
      "description": "简述操作方式，不超过四句话，每句25字以内",
      "rationale": "教育理念说明，不超过四句话，每句25字以内"
    }
  ]
}

注意事项：
1. 导入阶段（5-10分钟）需要：触发认知冲突、激发兴趣、唤醒观察力、初步理解目标、为不同水平提供思考支点
2. 每个选项都要符合维果茨基的"最近发展区"、布鲁姆教学目标分类、人本主义、信息处理理论等教育理念
3. 生成5个选项
4. 所有description和rationale字段都必须严格控制在四句话以内，每句话不超过25个字
5. 标题要简洁有力，4-6个字
6. 确保JSON格式完全正确，可以被JSON.parse()解析`;
    } else if (body.type === 'activity') {
      optionsKey = "activityOptions";
      prompt = `你是一位专业的教学设计师，为"求真学社"重新生成课堂活动环节的5个新选项。

## 基本信息
教师姓名：${body.teacherName}
年级：${body.grade}
科目：${body.subject}
知识点：${body.knowledgePoint}
课程目标：${body.courseObjective}

请严格按照以下格式生成JSON（必须确保JSON格式正确，不要添加任何额外文本）：

{
  "options": [
    {
      "id": 1,
      "title": "活动标题（4-6字）",
      "description": "活动简述，不超过四句话，每句25字以内",
      "rationale": "脚手架说明，不超过四句话，每句25字以内"
    }
  ]
}

注意事项：
1. 课堂活动（40-45分钟）需要：结合人本主义（关注情感、自主性）、布鲁姆目标分类（不同认知层次）、信息处理理论（输入、编码、储存、提取）、为不同层次搭建脚手架
2. 每个选项都要符合维果茨基的"最近发展区"、布鲁姆教学目标分类、人本主义、信息处理理论等教育理念
3. 生成5个选项
4. 所有description和rationale字段都必须严格控制在四句话以内，每句话不超过25个字
5. 标题要简洁有力，4-6个字
6. 确保JSON格式完全正确，可以被JSON.parse()解析`;
    } else if (body.type === 'summary') {
      optionsKey = "summaryOptions";
      prompt = `你是一位专业的教学设计师，为"求真学社"重新生成总结环节的5个新选项。

## 基本信息
教师姓名：${body.teacherName}
年级：${body.grade}
科目：${body.subject}
知识点：${body.knowledgePoint}
课程目标：${body.courseObjective}

请严格按照以下格式生成JSON（必须确保JSON格式正确，不要添加任何额外文本）：

{
  "options": [
    {
      "id": 1,
      "title": "总结标题（4-6字）",
      "description": "总结简述，不超过四句话，每句25字以内",
      "rationale": "评估说明，不超过四句话，每句25字以内"
    }
  ]
}

注意事项：
1. 总结阶段（10-15分钟）需要：促进反思、帮助教师进行过程性评估、了解不同层次学生目标达成情况
2. 每个选项都要符合维果茨基的"最近发展区"、布鲁姆教学目标分类、人本主义、信息处理理论等教育理念
3. 生成5个选项
4. 所有description和rationale字段都必须严格控制在四句话以内，每句话不超过25个字
5. 标题要简洁有力，4-6个字
6. 确保JSON格式完全正确，可以被JSON.parse()解析`;
    }

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
      temperature: getModelTemperature(model, 0.8),
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
    console.error("Error regenerating options:", error);
    res.status(500).json({
      error: "Failed to regenerate options",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
