import express, { type Request, type Response } from "express";
import { getSupabaseClient } from "../storage/database/supabase-client";
import { LLMClient, Config, HeaderUtils } from "coze-coding-dev-sdk";
import type { LessonPlan } from "../storage/database/shared/schema";

const router = express.Router();

// Helper function to get appropriate temperature for model
function getModelTemperature(model: string | undefined, defaultTemp: number = 0.7): number {
  // Kimi K2.5 only supports temperature 0.6
  if (model === 'kimi-k2-5-260127') {
    return 0.6;
  }
  return defaultTemp;
}

// Helper function to evaluate lesson plan difficulty using LLM
async function evaluateLessonPlanDifficulty(
  grade: string,
  subject: string,
  knowledgePoint: string,
  tieredObjectives: {
    basic: string;
    core: string;
    challenge: string;
  }
): Promise<number> {
  try {
    const config = new Config();
    const client = new LLMClient(config);

    const prompt = `请评估以下教案的难度等级，返回1-5之间的整数。

年级：${grade}
科目：${subject}
知识点：${knowledgePoint}

分层目标：
- 基础层：${tieredObjectives.basic}
- 核心层：${tieredObjectives.core}
- 挑战层：${tieredObjectives.challenge}

评估标准：
- 1级：非常简单，低年级（1-2年级）基础概念，单一知识点，操作步骤明确
- 2级：简单，低中年级（2-4年级）基础概念，知识点少，需要简单推理
- 3级：中等，中高年级（4-6年级）核心概念，知识点适中，需要一定推理和应用
- 4级：较难，高年级（6-8年级）复杂概念，知识点多，需要抽象思维和多步骤推理
- 5级：非常难，高年级（7-9年级）抽象概念，知识点复杂，需要深度分析和创新思维

请仅返回1-5之间的整数，不要返回其他内容。`;

    const messages = [
      {
        role: "system" as const,
        content: "你是一位专业的教学评估专家，擅长评估教案的难度等级。输出必须是1-5之间的整数。",
      },
      {
        role: "user" as const,
        content: prompt,
      },
    ];

    const response = await client.invoke(messages, {
      model: "doubao-seed-2-0-pro-260215",
      temperature: 0.1, // 使用低温度以确保稳定性
    });

    // 提取数字
    const difficultyMatch = response.content.match(/[1-5]/);
    if (difficultyMatch) {
      return parseInt(difficultyMatch[0]);
    }

    // 如果无法提取数字，返回默认值
    return 3;
  } catch (error) {
    console.error("Error evaluating lesson plan difficulty:", error);
    return 3; // 默认中等难度
  }
}

// Helper function to convert grade string to number for sorting
function getGradeNumber(grade: string): number {
  const gradeMap: Record<string, number> = {
    '小学一年级': 1,
    '小学二年级': 2,
    '小学三年级': 3,
    '小学四年级': 4,
    '小学五年级': 5,
    '小学六年级': 6,
    '初中一年级': 7,
    '初中二年级': 8,
    '初中三年级': 9,
  };
  return gradeMap[grade] || 9; // 默认返回最高年级
}

// Types
interface GenerateLessonPlanRequest {
  teacherName: string;
  grade: string;
  subject: string;
  knowledgePoint: string;
  courseObjective: string;
  lessonDate: string;
  model?: string;
  supplementaryMaterial?: string;
}

interface GeneratedOptions {
  tieredObjectives: {
    basic: string;
    core: string;
    challenge: string;
  };
  introOptions: Array<{
    id: number;
    title: string;
    description: string;
    rationale: string;
  }>;
  activityOptions: Array<{
    id: number;
    title: string;
    description: string;
    rationale: string;
  }>;
  summaryOptions: Array<{
    id: number;
    title: string;
    description: string;
    rationale: string;
  }>;
  learningMap: {
    basic: string;
    core: string;
    challenge: string;
  };
}

interface SaveLessonPlanRequest extends GenerateLessonPlanRequest {
  tieredObjectives: GeneratedOptions["tieredObjectives"];
  introOptions: GeneratedOptions["introOptions"];
  activityOptions: GeneratedOptions["activityOptions"];
  summaryOptions: GeneratedOptions["summaryOptions"];
  learningMap: GeneratedOptions["learningMap"];
  selectedIntroId: number;
  selectedActivityId: number;
  selectedSummaryId: number;
}

interface EnhancedSection {
  title: string;
  content: string;
  rationale: string;
  detailedSteps: string[];
}

interface EnhancedFullPlan {
  intro: EnhancedSection;
  activity: EnhancedSection;
  summary: EnhancedSection;
}

interface ExpandedSectionData {
  title: string;
  content: string; // Markdown formatted content
}

// Helper function to enhance a single section
async function enhanceSection(
  request: {
    teacherName: string;
    grade: string;
    subject: string;
    knowledgePoint: string;
    courseObjective: string;
  },
  sectionType: 'intro' | 'activity' | 'summary',
  selectedOption: { title: string; description: string; rationale: string },
  model?: string
): Promise<string> {
  const config = new Config();
  const client = new LLMClient(config);

  const selectedModel = model || "doubao-seed-2-0-pro-260215";

  const sectionInfo = {
    intro: { name: '导入环节', time: '5-10分钟', words: '约450字', needs: ['触发认知冲突', '激发兴趣', '唤醒观察力', '初步理解目标', '为不同水平提供思考支点'] },
    activity: { name: '课堂活动', time: '40-45分钟', words: '约1700字', needs: ['结合人本主义（关注情感、自主性）', '布鲁姆目标分类（不同认知层次）', '信息处理理论（输入、编码、储存、提取）', '为不同层次搭建脚手架'] },
    summary: { name: '总结阶段', time: '10-15分钟', words: '约480字', needs: ['促进反思', '帮助教师进行过程性评估', '了解不同层次学生目标达成情况'] }
  };

  const info = sectionInfo[sectionType];

  const prompt = `你是一位专业的教学设计师，负责将教案的${info.name}扩充为详细的、可操作的教案。

## 基本信息
教师姓名：${request.teacherName}
年级：${request.grade}
科目：${request.subject}
知识点：${request.knowledgePoint}
课程目标：${request.courseObjective}

## 选定的${info.name}（${info.time}）
标题：${selectedOption.title}
简要说明：${selectedOption.description}
设计理念：${selectedOption.rationale}

请按照以下结构扩充教案（必须包含所有标题）：

### 活动名称
${selectedOption.title}

#### 操作步骤
- 步骤1：具体操作说明
- 步骤2：具体操作说明
- 步骤3：具体操作说明

${sectionType === 'activity' ? `
#### 活动准备
- 教具材料：（列出需要的材料）
- 分组安排：（说明如何分组）
- 时间分配：（说明各环节时间）

#### 预期学生反应
- 基础层：预期的反应和能力
- 核心层：预期的反应和能力
- 挑战层：预期的反应和能力
` : ''}
${sectionType === 'summary' ? `
#### 过程性评估方法
- 如何收集不同层次学生的学习数据
- 如何判断各层目标的达成情况

#### 学生反思引导
- 基础层：引导反思什么
- 核心层：引导反思什么
- 挑战层：引导反思什么
` : ''}

#### 教师注意事项
- 关键注意事项（每行一条）

#### 设计理念说明
${selectedOption.rationale}

**扩充要求（非常重要）：**
1. 总字数控制在${info.words}
2. 每个操作步骤精简，用2-3句话说明即可
3. 预期反应和注意事项都要简短，每条不超过一行
4. 使用Markdown格式，保持清晰的结构
5. 不要输出其他内容，只输出上述Markdown格式的内容
6. 内容要具体、可操作，但必须简洁`;

  const messages = [
    {
      role: "system" as const,
      content: "你是一位专业的教学设计师，擅长将简短的教案扩充为详细的、可操作的教案。输出必须是Markdown格式。",
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

  return response.content;
}

// Helper function to generate lesson plan using LLM
async function generateLessonPlanContent(
  request: GenerateLessonPlanRequest
): Promise<GeneratedOptions> {
  const config = new Config();
  const client = new LLMClient(config);

  const model = request.model || "doubao-seed-2-0-pro-260215";

  const prompt = `你是一位专业的教学设计师，专门为"求真学社"的教师提供符合先进教育理念的教案生成服务。

请根据以下信息，生成一份结构完整的教案草案：

教师姓名：${request.teacherName}
年级：${request.grade}
科目：${request.subject}
知识点：${request.knowledgePoint}
课程目标：${request.courseObjective}
授课日期：${request.lessonDate}
${request.supplementaryMaterial ? `教学补充材料：${request.supplementaryMaterial}` : ''}

请严格按照以下格式生成JSON（必须确保JSON格式正确，不要添加任何额外文本）：

{
  "tieredObjectives": {
    "basic": "基础层目标：针对需要更多支持的学生，目标具体、可达，聚焦于基础知识的记忆与理解。不超过两句话。",
    "core": "核心层目标：针对大多数学生，目标明确，聚焦于知识的应用、分析。不超过两句话。",
    "challenge": "挑战层目标：针对学有余力的学生，目标具有挑战性，聚焦于综合、评价与创造。不超过两句话。"
  },
  "introOptions": [
    {
      "id": 1,
      "title": "选项标题（4-6字）",
      "description": "简述操作方式，不超过四句话，每句25字以内",
      "rationale": "教育理念说明，不超过四句话，每句25字以内"
    }
  ],
  "activityOptions": [
    {
      "id": 1,
      "title": "活动标题（4-6字）",
      "description": "活动简述，不超过四句话，每句25字以内",
      "rationale": "脚手架说明，不超过四句话，每句25字以内"
    }
  ],
  "summaryOptions": [
    {
      "id": 1,
      "title": "总结标题（4-6字）",
      "description": "总结简述，不超过四句话，每句25字以内",
      "rationale": "评估说明，不超过四句话，每句25字以内"
    }
  ],
  "learningMap": {
    "basic": "基础层路径描述（不超过两句话）",
    "core": "核心层路径描述（不超过两句话）",
    "challenge": "挑战层路径描述（不超过两句话）"
  }
}

注意事项：
1. 每个选项都要符合维果茨基的"最近发展区"、布鲁姆教学目标分类、人本主义、信息处理理论等教育理念
2. 导入阶段（5-10分钟）需要：触发认知冲突、激发兴趣、唤醒观察力、初步理解目标、为不同水平提供思考支点
3. 课堂活动（40-45分钟）需要：结合人本主义（关注情感、自主性）、布鲁姆目标分类（不同认知层次）、信息处理理论（输入、编码、储存、提取）、为不同层次搭建脚手架
4. 总结阶段（10-15分钟）需要：促进反思、帮助教师进行过程性评估、了解不同层次学生目标达成情况
5. 每个分类生成5个选项
6. 所有description和rationale字段都必须严格控制在四句话以内，每句话不超过25个字
7. 标题要简洁有力，4-6个字
8. 确保JSON格式完全正确，可以被JSON.parse()解析
9. ${request.supplementaryMaterial ? `【重要】请参考用户提供的补充材料，生成贴合学生实际情况和教师特殊需求的教案选项。` : ''}`;

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

  return JSON.parse(jsonMatch[0]);
}

// Helper function to enhance selected options with detailed steps
async function enhanceFullPlan(
  request: SaveLessonPlanRequest,
  generatedContent: GeneratedOptions
): Promise<string> {
  const config = new Config();
  const client = new LLMClient(config);

  const model = request.model || "doubao-seed-2-0-pro-260215";

  // Find selected options
  const selectedIntro = generatedContent.introOptions.find(opt => opt.id === request.selectedIntroId);
  const selectedActivity = generatedContent.activityOptions.find(opt => opt.id === request.selectedActivityId);
  const selectedSummary = generatedContent.summaryOptions.find(opt => opt.id === request.selectedSummaryId);

  if (!selectedIntro || !selectedActivity || !selectedSummary) {
    throw new Error("Selected options not found");
  }

  const prompt = `你是一位专业的教学设计师，负责将教案的三个核心环节（导入、课堂活动、总结）扩充为详细的、可操作的教案。

## 基本信息
教师姓名：${request.teacherName}
年级：${request.grade}
科目：${request.subject}
知识点：${request.knowledgePoint}
课程目标：${request.courseObjective}

## 选定的导入环节（5-10分钟）
标题：${selectedIntro.title}
简要说明：${selectedIntro.description}
设计理念：${selectedIntro.rationale}

## 选定的课堂活动环节（40-45分钟）
标题：${selectedActivity.title}
简要说明：${selectedActivity.description}
设计理念：${selectedActivity.rationale}

## 选定的总结环节（10-15分钟）
标题：${selectedSummary.title}
简要说明：${selectedSummary.description}
设计理念：${selectedSummary.rationale}

## 请按照以下Markdown格式扩充这三个环节（总字数控制在2500-3000字以内）：

## 二、导入阶段（5-10分钟，约400-500字）

### 活动名称：${selectedIntro.title}

#### 操作步骤
- 步骤1：一句话说明教师操作
- 步骤2：一句话说明学生活动
- 步骤3：一句话说明教师总结

#### 预期学生反应（各一行）
- 基础层：简短描述
- 核心层：简短描述
- 挑战层：简短描述

#### 教师注意事项
- 1-2个关键注意事项（每行一条）

#### 设计理念说明
${selectedIntro.rationale}

---

## 三、课堂活动（40-45分钟，约1500-1800字）

### 活动名称：${selectedActivity.title}

#### 活动准备
- 教具材料：列出2-3项主要材料
- 分组安排：简要说明
- 时间分配：各阶段时间（如：导入5分钟、活动30分钟、展示5分钟）

#### 操作步骤
- 步骤1：教师如何引导，学生如何参与（2-3句话）
- 步骤2：具体操作说明（2-3句话）
- 步骤3：小组合作或独立完成方式（2-3句话）
- 步骤4：成果展示方式（2-3句话）

#### 分层指导
- 基�层层：提供哪些支持（1-2句话）
- 核心层：提供哪些挑战（1-2句话）
- 挑战层：提供哪些拓展（1-2句话）

#### 预期成果
- 学生能够掌握的具体知识或技能（1-2句话）
- 学生能够完成的任务或作品（1-2句话）

#### 教师注意事项
- 2-3个关键注意事项（每行一条）

#### 设计理念说明
${selectedActivity.rationale}

---

## 四、总结阶段（10-15分钟，约400-500字）

### 活动名称：${selectedSummary.title}

#### 操作步骤
- 步骤1：一句话说明操作
- 步骤2：一句话说明学生反馈
- 步骤3：一句话说明教师总结

#### 过程性评估方法
- 如何收集不同层次学生的学习数据（1-2句话）
- 如何判断各层目标的达成情况（1-2句话）

#### 学生反思引导
- 基础层：引导反思什么（1句话）
- 核心层：引导反思什么（1句话）
- 挑战层：引导反思什么（1句话）

#### 教师注意事项
- 1-2个关键注意事项（每行一条）

#### 设计理念说明
${selectedSummary.rationale}

---

**扩充要求（非常重要）：**
1. 总字数严格控制在2500-3000字以内
2. 导入阶段约400-500字，课堂活动约1500-1800字，总结阶段约400-500字
3. 每个操作步骤精简，用2-3句话说明即可
4. 预期反应和注意事项都要简短，每条不超过一行
5. 使用Markdown格式，保持清晰的结构
6. 不要输出其他内容，只输出上述Markdown格式的内容
7. 内容要具体、可操作，但必须简洁`;

  const messages = [
    {
      role: "system" as const,
      content: "你是一位专业的教学设计师，擅长将简短的教案扩充为详细的、可操作的教案。输出必须是Markdown格式。",
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

  // Extract Markdown content (should be the whole response)
  return response.content;
}

// POST /api/v1/lesson-plans/generate - Generate lesson plan options with SSE progress
router.post("/generate", async (req: Request, res: Response) => {
  try {
    const body: GenerateLessonPlanRequest = req.body;

    // Validate required fields
    if (
      !body.teacherName ||
      !body.grade ||
      !body.subject ||
      !body.knowledgePoint ||
      !body.courseObjective ||
      !body.lessonDate
    ) {
      return res.status(400).json({
        error: "Missing required fields",
        details: "All fields are required: teacherName, grade, subject, knowledgePoint, courseObjective, lessonDate",
      });
    }

    console.log("Generating lesson plan for:", {
      teacher: body.teacherName,
      grade: body.grade,
      subject: body.subject,
    });

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, no-transform, must-revalidate');
    res.setHeader('Connection', 'keep-alive');

    // Send initial progress
    res.write(`data: ${JSON.stringify({ progress: 5, message: '开始分析教学目标和知识点...' })}\n\n`);

    // Simulate analysis time
    await new Promise(resolve => setTimeout(resolve, 2000));
    res.write(`data: ${JSON.stringify({ progress: 15, message: '正在构建教学设计提示词...' })}\n\n`);

    // Call LLM
    res.write(`data: ${JSON.stringify({ progress: 25, message: '正在调用大语言模型生成教案...' })}\n\n`);

    const generatedContent = await generateLessonPlanContent(body);

    res.write(`data: ${JSON.stringify({ progress: 95, message: '正在解析生成结果...' })}\n\n`);

    // Send final result
    await new Promise(resolve => setTimeout(resolve, 500));
    res.write(`data: ${JSON.stringify({ progress: 100, message: '完成', data: generatedContent })}\n\n`);

    // Send done signal
    res.write(`data: [DONE]\n\n`);
    res.end();
  } catch (error) {
    console.error("Error generating lesson plan:", error);
    
    // Try to send error via SSE if headers already sent
    if (!res.headersSent) {
      res.status(500).json({
        error: "Failed to generate lesson plan",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } else {
      res.write(`data: ${JSON.stringify({ progress: 0, message: '生成失败', error: error instanceof Error ? error.message : 'Unknown error' })}\n\n`);
      res.write(`data: [DONE]\n\n`);
      res.end();
    }
  }
});

// POST /api/v1/lesson-plans/preview - Preview and expand lesson plan with SSE progress
router.post("/preview", async (req: Request, res: Response) => {
  try {
    const body = req.body;

    // Validate required fields
    if (
      !body.teacherName ||
      !body.grade ||
      !body.subject ||
      !body.knowledgePoint ||
      !body.courseObjective ||
      !body.lessonDate ||
      !body.tieredObjectives ||
      !body.introOptions ||
      !body.activityOptions ||
      !body.summaryOptions ||
      !body.learningMap ||
      !body.selectedIntroIds ||
      !body.selectedActivityIds ||
      !body.selectedSummaryIds
    ) {
      return res.status(400).json({
        error: "Missing required fields",
        details: "All fields are required, including tieredObjectives, options, learningMap, and selectedIds",
      });
    }

    console.log("Previewing lesson plan for:", {
      teacher: body.teacherName,
      grade: body.grade,
      subject: body.subject,
    });

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, no-transform, must-revalidate');
    res.setHeader('Connection', 'keep-alive');

    // Find selected options
    const selectedIntro = body.introOptions.find((opt: any) => body.selectedIntroIds.includes(opt.id));
    const selectedActivity = body.activityOptions.find((opt: any) => body.selectedActivityIds.includes(opt.id));
    const selectedSummary = body.summaryOptions.find((opt: any) => body.selectedSummaryIds.includes(opt.id));

    if (!selectedIntro || !selectedActivity || !selectedSummary) {
      throw new Error("Selected options not found");
    }

    // Send initial progress
    res.write(`data: ${JSON.stringify({ progress: 5, message: '开始分析教学环节...' })}\n\n`);

    // Simulate analysis time
    await new Promise(resolve => setTimeout(resolve, 500));
    res.write(`data: ${JSON.stringify({ progress: 10, message: '正在扩写导入环节...' })}\n\n`);

    // Generate intro expansion
    const introExpanded = await enhanceSection(
      {
        teacherName: body.teacherName,
        grade: body.grade,
        subject: body.subject,
        knowledgePoint: body.knowledgePoint,
        courseObjective: body.courseObjective,
      },
      'intro',
      selectedIntro,
      body.model
    );

    res.write(`data: ${JSON.stringify({ progress: 35, message: '正在扩写课堂活动环节...' })}\n\n`);

    // Generate activity expansion
    const activityExpanded = await enhanceSection(
      {
        teacherName: body.teacherName,
        grade: body.grade,
        subject: body.subject,
        knowledgePoint: body.knowledgePoint,
        courseObjective: body.courseObjective,
      },
      'activity',
      selectedActivity,
      body.model
    );

    res.write(`data: ${JSON.stringify({ progress: 70, message: '正在扩写总结环节...' })}\n\n`);

    // Generate summary expansion
    const summaryExpanded = await enhanceSection(
      {
        teacherName: body.teacherName,
        grade: body.grade,
        subject: body.subject,
        knowledgePoint: body.knowledgePoint,
        courseObjective: body.courseObjective,
      },
      'summary',
      selectedSummary,
      body.model
    );

    res.write(`data: ${JSON.stringify({ progress: 85, message: '正在整理教案格式...' })}\n\n`);

    // Generate full plan with all expanded content
    const fullPlan = `# ${body.subject}教案 - ${body.knowledgePoint}

## 基本信息

- 授课教师：${body.teacherName}
- 年级：${body.grade}
- 科目：${body.subject}
- 知识点：${body.knowledgePoint}
- 课程目标：${body.courseObjective}
- 授课日期：${body.lessonDate}

---

## 一、分层课程目标

### 基础层目标
${body.tieredObjectives.basic}

### 核心层目标
${body.tieredObjectives.core}

### 挑战层目标
${body.tieredObjectives.challenge}

---

## 二、导入阶段（5-10分钟）

${introExpanded}

---

## 三、课堂活动（40-45分钟）

${activityExpanded}

---

## 四、总结阶段（10-15分钟）

${summaryExpanded}

---

## 五、学习地图与过程性评估

### 基础层路径
${body.learningMap.basic}

### 核心层路径
${body.learningMap.core}

### 挑战层路径
${body.learningMap.challenge}

---

**教案生成日期：${new Date().toLocaleString('zh-CN')}**
`;

    res.write(`data: ${JSON.stringify({ progress: 95, message: '完成扩写...' })}\n\n`);

    // Send final result
    await new Promise(resolve => setTimeout(resolve, 500));
    res.write(`data: ${JSON.stringify({ progress: 100, message: '完成', data: fullPlan, expandedSections: { intro: introExpanded, activity: activityExpanded, summary: summaryExpanded }, selectedOptions: { intro: [selectedIntro], activity: [selectedActivity], summary: [selectedSummary] } })}\n\n`);

    // Send done signal
    res.write(`data: [DONE]\n\n`);
    res.end();
  } catch (error) {
    console.error("Error previewing lesson plan:", error);
    
    // Try to send error via SSE if headers already sent
    if (!res.headersSent) {
      res.status(500).json({
        error: "Failed to preview lesson plan",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } else {
      res.write(`data: ${JSON.stringify({ progress: 0, message: '预览失败', error: error instanceof Error ? error.message : 'Unknown error' })}\n\n`);
      res.write(`data: [DONE]\n\n`);
      res.end();
    }
  }
});

// POST /api/v1/lesson-plans/save - Save a completed lesson plan (already expanded)
router.post("/save", async (req: Request, res: Response) => {
  try {
    const body = req.body;

    // Validate required fields
    if (
      !body.teacherName ||
      !body.grade ||
      !body.subject ||
      !body.knowledgePoint ||
      !body.courseObjective ||
      !body.lessonDate ||
      !body.fullPlan ||
      !body.tieredObjectives ||
      !body.introOptions ||
      !body.activityOptions ||
      !body.summaryOptions ||
      !body.learningMap ||
      !body.selectedIntroIds ||
      !body.selectedActivityIds ||
      !body.selectedSummaryIds
    ) {
      return res.status(400).json({
        error: "Missing required fields",
        details: "All fields are required, including fullPlan, all options, and selected IDs",
      });
    }

    console.log("Saving lesson plan for:", {
      teacher: body.teacherName,
      grade: body.grade,
      subject: body.subject,
    });

    // Evaluate difficulty using LLM
    const difficulty = await evaluateLessonPlanDifficulty(
      body.grade,
      body.subject,
      body.knowledgePoint,
      body.tieredObjectives
    );
    console.log("Evaluated difficulty:", difficulty);

    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from("lesson_plans")
      .insert({
        teacher_name: body.teacherName,
        grade: body.grade,
        subject: body.subject,
        knowledge_point: body.knowledgePoint,
        course_objective: body.courseObjective,
        lesson_date: body.lessonDate,
        tiered_objectives: body.tieredObjectives,
        intro_options: body.introOptions,
        activity_options: body.activityOptions,
        summary_options: body.summaryOptions,
        learning_map: body.learningMap,
        selected_intro_ids: body.selectedIntroIds,
        selected_activity_ids: body.selectedActivityIds,
        selected_summary_ids: body.selectedSummaryIds,
        full_plan: body.fullPlan, // Use the already expanded full plan
        difficulty: difficulty,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error saving lesson plan:", error);
    res.status(500).json({
      error: "Failed to save lesson plan",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// GET /api/v1/lesson-plans - List all lesson plans
router.get("/", async (req: Request, res: Response) => {
  try {
    const { grade, subject } = req.query;

    const supabase = getSupabaseClient();

    let query = supabase
      .from("lesson_plans")
      .select("*");

    if (grade) {
      query = query.eq("grade", grade as string);
    }
    if (subject) {
      query = query.eq("subject", subject as string);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    // Sort by grade (low to high) and difficulty (low to high)
    const sortedData = (data || []).sort((a, b) => {
      const gradeA = getGradeNumber(a.grade);
      const gradeB = getGradeNumber(b.grade);

      // First sort by grade
      if (gradeA !== gradeB) {
        return gradeA - gradeB;
      }

      // Then sort by difficulty
      return a.difficulty - b.difficulty;
    });

    res.status(200).json({
      success: true,
      data: sortedData,
    });
  } catch (error) {
    console.error("Error fetching lesson plans:", error);
    res.status(500).json({
      error: "Failed to fetch lesson plans",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// GET /api/v1/lesson-plans/:id - Get a specific lesson plan
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const idString = Array.isArray(id) ? id[0] : id;

    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from("lesson_plans")
      .select("*")
      .eq("id", parseInt(idString))
      .single();

    if (error) {
      throw error;
    }

    if (!data) {
      return res.status(404).json({
        error: "Lesson plan not found",
      });
    }

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error fetching lesson plan:", error);
    res.status(500).json({
      error: "Failed to fetch lesson plan",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// PATCH /api/v1/lesson-plans/:id - Update a lesson plan (e.g., rename knowledge point)
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const idString = Array.isArray(id) ? id[0] : id;
    const { knowledgePoint } = req.body;

    if (!knowledgePoint) {
      return res.status(400).json({
        error: "Missing required field",
        details: "knowledgePoint is required",
      });
    }

    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from("lesson_plans")
      .update({ knowledge_point: knowledgePoint })
      .eq("id", parseInt(idString))
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error updating lesson plan:", error);
    res.status(500).json({
      error: "Failed to update lesson plan",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// DELETE /api/v1/lesson-plans/:id - Delete a lesson plan
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const idString = Array.isArray(id) ? id[0] : id;

    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from("lesson_plans")
      .delete()
      .eq("id", parseInt(idString))
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error deleting lesson plan:", error);
    res.status(500).json({
      error: "Failed to delete lesson plan",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// POST /api/v1/lesson-plans/adjust-section - Adjust an entire section's expanded content (SSE streaming)
router.post("/adjust-section", async (req: Request, res: Response) => {
  try {
    const body = req.body;

    // Validate required fields
    if (
      !body.teacherName ||
      !body.grade ||
      !body.subject ||
      !body.knowledgePoint ||
      !body.courseObjective ||
      !body.lessonDate ||
      !body.sectionType ||
      !body.currentContent ||
      !body.adjustmentRequest ||
      !body.tieredObjectives ||
      !body.introOptions ||
      !body.activityOptions ||
      !body.summaryOptions ||
      !body.learningMap
    ) {
      return res.status(400).json({
        error: "Missing required fields",
      });
    }

    console.log("Adjusting section (streaming):", {
      type: body.sectionType,
      teacher: body.teacherName,
      adjustment: body.adjustmentRequest,
    });

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, no-transform, must-revalidate');
    res.setHeader('Connection', 'keep-alive');

    // Extract headers for SDK
    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers as Record<string, string>);

    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    const model = body.model || "doubao-seed-2-0-pro-260215";

    // Determine section info
    const sectionInfo: Record<string, { name: string; time: string; words: string }> = {
      intro: { name: '导入阶段', time: '5-10分钟', words: '约450字' },
      activity: { name: '课堂活动', time: '40-45分钟', words: '约1700字' },
      summary: { name: '总结阶段', time: '10-15分钟', words: '约480字' }
    };

    const info = sectionInfo[body.sectionType];

    const prompt = `你是一位专业的教学设计师，帮助教师调整教案${info.name}的扩写内容。

## 基本信息
教师姓名：${body.teacherName}
年级：${body.grade}
科目：${body.subject}
知识点：${body.knowledgePoint}
课程目标：${body.courseObjective}
授课日期：${body.lessonDate}

## 当前扩写内容
${body.currentContent}

## 教师的调整需求
${body.adjustmentRequest}

## 要求

请根据教师的调整需求，对${info.name}的扩写内容进行优化调整，调整后的方案必须：

1. **符合需求**：完全满足教师提出的调整要求
2. **保持理念**：继续符合维果茨基的最近发展区、布鲁姆教学目标分类、人本主义、信息处理理论等教育理念
3. **保持时长**：保持在${info.time}的时间范围内
4. **字数控制**：保持在${info.words}
5. **具体可行**：调整后的方案要具体、可操作
6. **Markdown格式**：使用Markdown格式，保持清晰的结构
7. **不改变本质**：调整应该是优化，而不是完全改变环节类型

## 输出格式

请直接输出调整后的Markdown格式内容，不要包含任何其他说明文字。

**重要提示**：
- 保持原有的Markdown格式结构
- 操作步骤、预期反应、注意事项等都要具体但不冗长
- 内容要清晰、有条理
- 确保内容符合教育专业性`;

    const messages = [
      {
        role: "system" as const,
        content: "你是一位专业的教学设计师，擅长运用维果茨基的最近发展区理论、布鲁姆教学目标分类、人本主义和信息处理理论设计教案。输出必须是Markdown格式。",
      },
      {
        role: "user" as const,
        content: prompt,
      },
    ];

    // Use streaming API
    const stream = client.stream(messages, {
      model,
      temperature: 0.7,
    });

    // Stream chunks to client
    for await (const chunk of stream) {
      if (chunk.content) {
        const content = chunk.content.toString();
        // Send each chunk via SSE
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    // Send done signal
    res.write(`data: [DONE]\n\n`);
    res.end();
  } catch (error) {
    console.error("Error adjusting section (streaming):", error);

    // Try to send error via SSE if headers already sent
    if (!res.headersSent) {
      res.status(500).json({
        error: "Failed to adjust section",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } else {
      res.write(`data: ${JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' })}\n\n`);
      res.write(`data: [DONE]\n\n`);
      res.end();
    }
  }
});

export default router;
