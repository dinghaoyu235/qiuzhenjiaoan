import express, { type Request, type Response } from "express";
import { getSupabaseClient } from "../storage/database/supabase-client";
import { LLMClient, Config, HeaderUtils } from "coze-coding-dev-sdk";
import type { LessonPlan } from "../storage/database/shared/schema";

const router = express.Router();

// Helper function to get appropriate temperature for model
function getModelTemperature(model: string, defaultTemp: number = 0.7): number {
  // Kimi K2.5 only supports temperature 0.6
  if (model === 'kimi-k2-5-260127') {
    return 0.6;
  }
  return defaultTemp;
}

// Types (same as lesson-plans.ts)
interface SaveLessonPlanRequest {
  teacherName: string;
  grade: string;
  subject: string;
  knowledgePoint: string;
  courseObjective: string;
  lessonDate: string;
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
  selectedIntroIds: number[];
  selectedActivityIds: number[];
  selectedSummaryIds: number[];
}

// Helper function to send SSE progress event
function sendProgress(res: Response, step: string, progress: number, message: string) {
  res.write(`data: ${JSON.stringify({ step, progress, message })}\n\n`);
}

// Helper function to enhance full plan with progress updates
async function enhanceFullPlanWithProgress(
  request: SaveLessonPlanRequest,
  generatedContent: SaveLessonPlanRequest,
  res: Response
): Promise<string> {
  const config = new Config();
  const client = new LLMClient(config);

  // Find selected options (support multiple selections)
  const selectedIntros = generatedContent.introOptions.filter(opt => request.selectedIntroIds.includes(opt.id));
  const selectedActivities = generatedContent.activityOptions.filter(opt => request.selectedActivityIds.includes(opt.id));
  const selectedSummaries = generatedContent.summaryOptions.filter(opt => request.selectedSummaryIds.includes(opt.id));

  if (selectedIntros.length === 0 || selectedActivities.length === 0 || selectedSummaries.length === 0) {
    throw new Error("Selected options not found");
  }

  sendProgress(res, "preparing", 10, "正在准备扩充教案内容...");

  // Build prompt with multiple options
  const introSection = selectedIntros.map((opt, idx) => `
### 选项${idx + 1}：${opt.title}
简要说明：${opt.description}
设计理念：${opt.rationale}
`).join('\n');

  const activitySection = selectedActivities.map((opt, idx) => `
### 选项${idx + 1}：${opt.title}
简要说明：${opt.description}
设计理念：${opt.rationale}
`).join('\n');

  const summarySection = selectedSummaries.map((opt, idx) => `
### 选项${idx + 1}：${opt.title}
简要说明：${opt.description}
设计理念：${opt.rationale}
`).join('\n');

  const prompt = `你是一位专业的教学设计师，负责将教案的三个核心环节（导入、课堂活动、总结）扩充为详细的、可操作的教案。

## 基本信息
教师姓名：${request.teacherName}
年级：${request.grade}
科目：${request.subject}
知识点：${request.knowledgePoint}
课程目标：${request.courseObjective}

## 选定的导入环节（5-10分钟）
${introSection}

## 选定的课堂活动环节（40-45分钟）
${activitySection}

## 选定的总结环节（10-15分钟）
${summarySection}

## 请按照以下Markdown格式扩充这三个环节（总字数控制在2500-3000字以内）：

## 二、导入阶段（5-10分钟，约400-500字）

### 活动组合说明
教师可以根据实际情况从${selectedIntros.length}个选项中灵活组合，以下是综合活动设计：

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
${selectedIntros.map((opt, idx) => `选项${idx + 1}：${opt.rationale}`).join('\n')}

---

## 三、课堂活动（40-45分钟，约1500-1800字）

### 活动组合说明
教师可以根据实际情况从${selectedActivities.length}个选项中灵活组合，以下是综合活动设计：

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
- 基础层：提供哪些支持（1-2句话）
- 核心层：提供哪些挑战（1-2句话）
- 挑战层：提供哪些拓展（1-2句话）

#### 预期成果
- 学生能够掌握的具体知识或技能（1-2句话）
- 学生能够完成的任务或作品（1-2句话）

#### 教师注意事项
- 2-3个关键注意事项（每行一条）

#### 设计理念说明
${selectedActivities.map((opt, idx) => `选项${idx + 1}：${opt.rationale}`).join('\n')}

---

## 四、总结阶段（10-15分钟，约400-500字）

### 活动组合说明
教师可以根据实际情况从${selectedSummaries.length}个选项中灵活组合，以下是综合活动设计：

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
${selectedSummaries.map((opt, idx) => `选项${idx + 1}：${opt.rationale}`).join('\n')}

---

**扩充要求（非常重要）：**
1. 总字数严格控制在2500-3000字以内
2. 导入阶段约400-500字，课堂活动约1500-1800字，总结阶段约400-500字
3. 每个操作步骤精简，用2-3句话说明即可
4. 预期反应和注意事项都要简短，每条不超过一行
5. 将多个选项进行有机融合，形成连贯的教案
6. 使用Markdown格式，保持清晰的结构
7. 不要输出其他内容，只输出上述Markdown格式的内容
8. 内容要具体、可操作，但必须简洁`;

  sendProgress(res, "generating", 30, "正在扩充导入环节内容...");

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
    model: "doubao-seed-2-0-pro-260215",
    temperature: getModelTemperature("doubao-seed-2-0-pro-260215", 0.7),
  });

  sendProgress(res, "generated", 80, "内容扩充完成，正在保存教案...");

  return response.content;
}

// POST /api/v1/lesson-plans/save-stream - Save lesson plan with progress updates
router.post("/save-stream", async (req: Request, res: Response) => {
  try {
    const body: SaveLessonPlanRequest = req.body;

    // Validate required fields
    if (
      !body.teacherName ||
      !body.grade ||
      !body.subject ||
      !body.knowledgePoint ||
      !body.courseObjective ||
      !body.lessonDate ||
      !body.selectedIntroIds ||
      !body.selectedActivityIds ||
      !body.selectedSummaryIds
    ) {
      return res.status(400).json({
        error: "Missing required fields",
        details: "All fields are required, including selectedIntroIds, selectedActivityIds, selectedSummaryIds",
      });
    }

    console.log("Streaming save lesson plan for:", {
      teacher: body.teacherName,
      grade: body.grade,
      subject: body.subject,
      selectedIntroIds: body.selectedIntroIds,
      selectedActivityIds: body.selectedActivityIds,
      selectedSummaryIds: body.selectedSummaryIds,
    });

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, no-transform, must-revalidate');
    res.setHeader('Connection', 'keep-alive');

    sendProgress(res, "started", 0, "开始生成教案...");

    // Generate enhanced full plan
    const enhancedContent = await enhanceFullPlanWithProgress(body, body, res);

    // Generate full plan with enhanced content
    const fullPlan = `# ${body.subject}教案 - ${body.knowledgePoint}

## 基本信息

- 授课教师：${body.teacherName}
- 年级：${body.grade}
- 科目：${body.subject}
- 知识点：${body.knowledgePoint}
- 课程目标：${body.courseObjective}
- 授课日期：${body.lessonDate}

---

${enhancedContent}

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

    sendProgress(res, "saving", 90, "正在保存到数据库...");

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
        full_plan: fullPlan,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Send completion event
    res.write(`data: ${JSON.stringify({ step: "completed", progress: 100, message: "教案保存成功！", data })}\n\n`);
    res.write(`data: [DONE]\n\n`);
    res.end();
  } catch (error) {
    console.error("Error saving lesson plan:", error);
    // Send error event
    res.write(`data: ${JSON.stringify({ step: "error", progress: 0, message: error instanceof Error ? error.message : "Unknown error" })}\n\n`);
    res.write(`data: [DONE]\n\n`);
    res.end();
  }
});

export default router;
