import express, { type Request, type Response } from "express";
import { getSupabaseClient } from "../storage/database/supabase-client";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";

const router = express.Router();

/**
 * 解析 Markdown 文本为 Word 段落数组
 */
function parseMarkdownToParagraphs(markdown: string): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  const lines = markdown.split('\n');
  let lastHeadingLevel = 0; // 0=无, 1=#, 2=##, 3=###
  let lastHeadingText = '';

  for (const line of lines) {
    const trimmedLine = line.trim();

    // 跳过空行（但保留一个空段落作为间距）
    if (trimmedLine === '') {
      paragraphs.push(new Paragraph({ text: '', spacing: { after: 200 } }));
      continue;
    }

    // 处理标题
    if (trimmedLine.startsWith('###')) {
      lastHeadingLevel = 3;
      lastHeadingText = trimmedLine.replace(/^###\s*/, '').trim();
      const text = lastHeadingText;
      paragraphs.push(new Paragraph({
        text,
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 300, after: 150 },
      }));
    } else if (trimmedLine.startsWith('##')) {
      lastHeadingLevel = 2;
      lastHeadingText = trimmedLine.replace(/^##\s*/, '').trim();
      const text = lastHeadingText;
      paragraphs.push(new Paragraph({
        text,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 },
      }));
    } else if (trimmedLine.startsWith('#')) {
      lastHeadingLevel = 1;
      lastHeadingText = trimmedLine.replace(/^#\s*/, '').trim();
      const text = lastHeadingText;
      paragraphs.push(new Paragraph({
        text,
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { before: 400, after: 200 },
      }));
    }
    // 处理分隔线
    else if (trimmedLine.startsWith('---')) {
      // Word doesn't have a simple horizontal line, just add spacing
      paragraphs.push(new Paragraph({ text: '', spacing: { after: 300 } }));
    }
    // 处理列表项（- 或 * 开头）
    else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
      const text = trimmedLine.replace(/^[-*]\s*/, '').trim();
      
      // 如果上一个标题是"基本信息"，不要缩进
      const isBasicInfo = lastHeadingText === '基本信息';
      
      if (isBasicInfo) {
        // 格式化为：教师姓名：xxx
        paragraphs.push(new Paragraph({
          text: text.replace(/^(授课教师|年级|科目|知识点|课程目标|授课日期)：/, (match) => match),
          spacing: { after: 100 },
        }));
      } else {
        // 普通列表项，添加缩进
        paragraphs.push(new Paragraph({
          children: [
            new TextRun({ text: '• ', bold: true }),
            new TextRun(text),
          ],
          spacing: { after: 120 },
          indent: { left: 720 }, // 1英寸缩进
        }));
      }
    }
    // 处理数字列表（1. 2. 3.）
    else if (/^\d+\.\s/.test(trimmedLine)) {
      const text = trimmedLine.replace(/^\d+\.\s*/, '').trim();
      paragraphs.push(new Paragraph({
        children: [
          new TextRun(text),
        ],
        spacing: { after: 120 },
        indent: { left: 720 },
      }));
    }
    // 处理加粗文本（**text**）
    else if (trimmedLine.includes('**')) {
      const children: TextRun[] = [];
      const parts = trimmedLine.split(/\*\*(.+?)\*\*/g);
      for (let i = 0; i < parts.length; i++) {
        if (parts[i]) {
          if (i % 2 === 1) {
            // 奇数索引是加粗内容
            children.push(new TextRun({ text: parts[i], bold: true }));
          } else {
            // 偶数索引是普通文本
            children.push(new TextRun(parts[i]));
          }
        }
      }
      paragraphs.push(new Paragraph({
        children,
        spacing: { after: 200 },
      }));
    }
    // 普通段落
    else {
      paragraphs.push(new Paragraph({
        text: trimmedLine,
        spacing: { after: 200 },
      }));
    }
  }

  return paragraphs;
}

// GET /api/v1/lesson-plans/:id/export-word - Export lesson plan as Word document
router.get("/:id/export-word", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const idString = Array.isArray(id) ? id[0] : id;

    const supabase = getSupabaseClient();

    const { data: lessonPlan, error } = await supabase
      .from("lesson_plans")
      .select("*")
      .eq("id", parseInt(idString))
      .single();

    if (error) {
      throw error;
    }

    if (!lessonPlan) {
      return res.status(404).json({
        error: "Lesson plan not found",
      });
    }

    // 解析完整教案的 Markdown 内容
    const fullPlanParagraphs = parseMarkdownToParagraphs(lessonPlan.full_plan || "");

    // Create Word document
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          // 直接使用 fullPlan 的完整内容，不再重复添加
          ...fullPlanParagraphs,

          // Footer
          new Paragraph({
            children: [
              new TextRun({
                text: `教案导出日期：${new Date().toLocaleString('zh-CN')}`,
                size: 20,
                color: "999999",
              }),
            ],
            spacing: {
              before: 600,
            },
          }),
        ],
      }],
    });

    // Generate buffer
    const buffer = await Packer.toBuffer(doc);

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    // 使用 UTF-8 编码文件名以支持中文
    const filename = `${lessonPlan.subject}-${lessonPlan.knowledge_point}.docx`;
    const encodedFilename = encodeURIComponent(filename);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFilename}`);
    res.setHeader('Content-Length', buffer.length);

    // Send buffer
    res.send(buffer);

  } catch (error) {
    console.error("Error exporting lesson plan:", error);
    res.status(500).json({
      error: "Failed to export lesson plan",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
