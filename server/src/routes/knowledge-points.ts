import express, { type Request, type Response } from "express";
import { LLMClient, Config } from "coze-coding-dev-sdk";

const router = express.Router();

interface KnowledgePointsRequest {
  grade: string;
  subject: string;
}

interface KnowledgePoint {
  id: number;
  name: string;
  difficulty: number; // 1-5, 1最简单，5最难
  description?: string;
}

// POST /api/v1/lesson-plans/knowledge-points - Get knowledge points by grade and subject
router.post("/knowledge-points", async (req: Request, res: Response) => {
  try {
    const body: KnowledgePointsRequest = req.body;

    // Validate required fields
    if (!body.grade || !body.subject) {
      return res.status(400).json({
        error: "Missing required fields",
        details: "grade and subject are required",
      });
    }

    console.log("Getting knowledge points for:", { grade: body.grade, subject: body.subject });

    const config = new Config();
    const client = new LLMClient(config);

    // Determine grade level and provide specific requirements
    const isPrimary = ['小学1年级', '小学2年级', '小学3年级', '小学4年级', '小学5年级', '小学6年级'].includes(body.grade);
    const isMiddle = ['初中1年级', '初中2年级', '初中3年级'].includes(body.grade);

    let gradeSpecificRequirements = '';

    if (isPrimary && body.subject === '英语') {
      gradeSpecificRequirements = `
**小学英语课程标准要求（1-6年级）**：
- 词汇量：1-2年级（300-400词），3-4年级（600-700词），5-6年级（800-1000词）
- 语法：简单句型、一般现在时、现在进行时、一般过去时等基础语法
- 技能：听、说为主，读写为辅
- 内容：日常对话、简单故事、基础词汇和句型
- 难度：基础词汇（颜色、数字、动物、食物等），简单句型`;
    } else if (isMiddle && body.subject === '英语') {
      gradeSpecificRequirements = `
**初中英语课程标准要求（7-9年级）**：
- 词汇量：7年级（1500-1600词），8年级（1800-2000词），9年级（2200-2500词）
- 语法：复合句（宾语从句、状语从句）、被动语态、完成时态、虚拟语气等
- 技能：听、说、读、写全面发展，强调阅读理解和写作能力
- 内容：较长的语篇理解、话题写作、跨文化交际
- 难度：复杂句型、从句结构、时态综合应用、语篇理解`;
    } else if (isPrimary && body.subject === '语文') {
      gradeSpecificRequirements = `
**小学语文课程标准要求（1-6年级）**：
- 识字量：1-2年级（1600-1800字），3-4年级（2500字），5-6年级（3000字）
- 写字：正确、端正、整洁
- 阅读：理解课文主要内容，积累优美词句
- 写作：1-2年级（写话），3-6年级（习作）
- 口语：说普通话，态度自然大方`;
    } else if (isMiddle && body.subject === '语文') {
      gradeSpecificRequirements = `
**初中语文课程标准要求（7-9年级）**：
- 识字写字：累计认识常用汉字3500个
- 阅读：独立阅读，理解主要内容，分析作者思想
- 写作：能写记叙文、说明文、议论文等
- 口语交际：能清楚表达观点，参与讨论
- 综合性学习：搜集资料、合作探究`;
    } else if (isPrimary && body.subject === '数学') {
      gradeSpecificRequirements = `
**小学数学课程标准要求（1-6年级）**：
- 数与代数：整数、小数、分数的认识和运算
- 图形与几何：平面图形、立体图形的认识和测量
- 统计与概率：数据收集和简单统计
- 综合与实践：解决实际问题`;
    } else if (isMiddle && body.subject === '数学') {
      gradeSpecificRequirements = `
**初中数学课程标准要求（7-9年级）**：
- 数与代数：实数、代数式、方程、不等式、函数
- 图形与几何：平面几何证明、图形变换、三角函数
- 统计与概率：数据统计与分析、概率基础
- 综合与实践：数学建模、综合应用`;
    }

    const prompt = `你是一位资深的教育专家，熟悉中国国家义务教育课程标准和各学科知识大纲。

请为${body.grade}${body.subject}学科生成20个核心知识点，这些知识点必须是该年级该学科的重点内容，严格遵循国家义务教育课程标准和知识大纲。

${gradeSpecificRequirements}

## 要求：

1. **符合课程标准**：知识点必须来自国家义务教育课程标准和教材，是该年级该学科的核心内容
2. **难度递进**：按照学习难度从易到难排序（难度1-5级，1最简单，5最难），每个难度等级分配3-5个知识点
3. **覆盖全面**：涵盖该年级该学科的主要知识模块，包括基础、核心和拓展内容
4. **细化拆分**：将大的知识点拆分为更小的知识单元，每个知识点要具体、明确、可操作
5. **避免混淆**：${isPrimary ? '这是小学阶段，不要推荐初中或高中的知识点' : '这是初中阶段，不要推荐小学或高中的知识点'}
6. **数量要求**：必须生成正好20个知识点，不多不少

## 输出格式：

请严格按照以下JSON格式输出（确保JSON格式正确，不要添加任何额外文本）：

{
  "knowledgePoints": [
    {
      "id": 1,
      "name": "知识点的名称（不超过10个字）",
      "difficulty": 1,
      "description": "简要描述该知识点的学习内容和要求（30-50字）"
    }
  ]
}

${isPrimary && body.subject === '英语' ? `
## 示例（小学英语，仅供参考格式）：
{
  "knowledgePoints": [
    {
      "id": 1,
      "name": "问候Hello",
      "difficulty": 1,
      "description": "学习Hello问候语，能对老师、同学打招呼"
    },
    {
      "id": 2,
      "name": "道别Goodbye",
      "difficulty": 1,
      "description": "学习Goodbye道别语，能自然道别"
    },
    {
      "id": 3,
      "name": "数字1-5",
      "difficulty": 1,
      "description": "学习数字1-5的英文，能认读和数数"
    },
    {
      "id": 4,
      "name": "颜色红色",
      "difficulty": 1,
      "description": "学习red红色，能识别红色物品"
    }
  ]
}
` : isMiddle && body.subject === '英语' ? `
## 示例（初中英语，仅供参考格式）：
{
  "knowledgePoints": [
    {
      "id": 1,
      "name": "不规则动词",
      "difficulty": 2,
      "description": "掌握常见不规则动词的过去式变化规则"
    },
    {
      "id": 2,
      "name": "疑问句转换",
      "difficulty": 2,
      "description": "掌握陈述句转换为疑问句的方法"
    },
    {
      "id": 3,
      "name": "宾语从句",
      "difficulty": 4,
      "description": "掌握that引导的宾语从句的用法"
    },
    {
      "id": 4,
      "name": "时间状语从句",
      "difficulty": 4,
      "description": "掌握when引导的时间状语从句"
    }
  ]
}
` : `
## 示例（仅供参考格式）：
{
  "knowledgePoints": [
    {
      "id": 1,
      "name": "基础概念",
      "difficulty": 1,
      "description": "描述基础知识点"
    },
    {
      "id": 2,
      "name": "核心技能",
      "difficulty": 2,
      "description": "描述核心技能点"
    }
  ]
}
`}

**重要提示**：
- 确保返回的JSON格式完全正确
- 难度等级从1开始，依次递增，每个难度3-5个知识点
- 知识点数量必须是20个
- 知识点必须真实存在于${body.grade}${body.subject}课程标准中
- ${isPrimary ? '小学阶段知识点要基础、具体、贴近生活' : '初中阶段知识点要有一定深度和综合性'}
- 将大的知识模块拆分为更小的知识单元，如"定语从句"可以拆分为"who引导定语从句"、"which引导定语从句"、"that引导定语从句"等`;

    const messages = [
      {
        role: "system" as const,
        content: "你是一位资深的教育专家，熟悉中国国家义务教育课程标准和各学科知识大纲。输出必须是有效的JSON格式。",
      },
      {
        role: "user" as const,
        content: prompt,
      },
    ];

    const response = await client.invoke(messages, {
      model: "doubao-seed-2-0-pro-260215",
      temperature: 0.5, // 较低的温度确保知识点准确
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
    console.error("Error getting knowledge points:", error);
    res.status(500).json({
      error: "Failed to get knowledge points",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
