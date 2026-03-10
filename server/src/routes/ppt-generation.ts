import express, { type Request, type Response } from 'express';
import multer from 'multer';
import PptxGenJS from 'pptxgenjs';
import { LLMClient, ImageGenerationClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { generatePPTMainPrompt, generatePPTModifyPrompt, type PPTPromptConfig } from '../prompts/ppt-generation';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

/**
 * POST /api/v1/ppt/generate
 * Generate PPT from lesson plan
 */
router.post('/generate', upload.single('lessonPlan'), async (req: Request, res: Response) => {
  try {
    const { subject, grade, lessonTitle, lessonObjective, teachingKeyPoints, targetAudience, estimatedDuration, style } = req.body;
    const lessonPlanFile = req.file;

    // Extract lesson plan content from file if uploaded
    let lessonPlanContent = '';
    if (lessonPlanFile) {
      lessonPlanContent = lessonPlanFile.buffer.toString('utf-8');
    }

    // Prepare prompt configuration
    const config: PPTPromptConfig = {
      subject: subject || '语文',
      grade: grade || '小学1年级',
      lessonTitle: lessonTitle || '新课程',
      lessonObjective: lessonObjective || '',
      teachingKeyPoints: teachingKeyPoints || lessonPlanContent || '',
      targetAudience: targetAudience || '小学生',
      estimatedDuration: estimatedDuration || '45分钟',
      style: style || 'minimal',
    };

    // Generate prompt
    const prompt = generatePPTMainPrompt(config);

    // Initialize LLM client
    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers as Record<string, string>);
    const llmConfig = new Config();
    const client = new LLMClient(llmConfig, customHeaders);

    // Call LLM with streaming
    const messages = [
      { role: 'system' as const, content: '你是一位专业的教育 PPT 设计师，精通教育心理学和视觉传达设计。' },
      { role: 'user' as const, content: prompt },
    ];

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, no-transform, must-revalidate');
    res.setHeader('Connection', 'keep-alive');

    const stream = client.stream(messages, {
      model: 'doubao-seed-2-0-pro-260215',
      temperature: 0.7,
    } as any);

    let fullContent = '';

    for await (const chunk of stream) {
      if (chunk.content) {
        const text = chunk.content.toString();
        fullContent += text;
        res.write(`data: ${JSON.stringify({ type: 'chunk', content: text })}\n\n`);
      }
    }

    res.write(`data: [DONE]\n\n`);
    res.end();

  } catch (error) {
    console.error('PPT generation error:', error);
    res.status(500).json({
      error: 'Failed to generate PPT',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/v1/ppt/modify
 * Modify PPT slide using voice command
 */
router.post('/modify', async (req: Request, res: Response) => {
  try {
    const { currentSlideContent, userCommand } = req.body;

    if (!currentSlideContent || !userCommand) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'currentSlideContent and userCommand are required',
      });
    }

    // Generate modification prompt
    const prompt = generatePPTModifyPrompt(currentSlideContent, userCommand);

    // Initialize LLM client
    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers as Record<string, string>);
    const llmConfig = new Config();
    const client = new LLMClient(llmConfig, customHeaders);

    const messages = [
      { role: 'system' as const, content: '你是一位专业的 PPT 编辑助手，帮助教师快速修改 PPT 内容。' },
      { role: 'user' as const, content: prompt },
    ];

    // Call LLM
    const response = await client.invoke(messages, {
      model: 'doubao-seed-2-0-pro-260215',
      temperature: 0.5,
    } as any);

    // Parse JSON response
    let parsedResponse;
    try {
      // Try to extract JSON from response
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        parsedResponse = { modified: false, changes: [], newSlideContent: null };
      }
    } catch (parseError) {
      parsedResponse = { modified: false, changes: [], newSlideContent: null };
    }

    res.json({
      success: true,
      data: parsedResponse,
      rawResponse: response.content,
    });

  } catch (error) {
    console.error('PPT modification error:', error);
    res.status(500).json({
      error: 'Failed to modify PPT',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/v1/ppt/export
 * Export PPT to PPTX or PDF format
 */
router.post('/export', async (req: Request, res: Response) => {
  try {
    const { pptStructure, exportFormat = 'pptx' } = req.body;

    if (!pptStructure) {
      return res.status(400).json({
        error: 'Missing required field',
        message: 'pptStructure is required',
      });
    }

    // Validate export format
    if (exportFormat !== 'pptx' && exportFormat !== 'pdf') {
      return res.status(400).json({
        error: 'Invalid export format',
        message: 'exportFormat must be "pptx" or "pdf"',
      });
    }

    console.log('[PPT Export] Starting export process:', {
      exportFormat,
      slidesCount: pptStructure.slides?.length || 0,
      title: pptStructure.metadata?.title || 'Untitled',
    });

    // Create PPT presentation
    const pptx = new (PptxGenJS as any).default();

    // Set presentation properties
    pptx.title = pptStructure.metadata?.title || 'Presentation';
    pptx.author = 'Teacher';
    pptx.company = 'School';

    // Get design guidance
    const designGuidance = pptStructure.designGuidance || {};

    // Add slides
    if (pptStructure.slides && Array.isArray(pptStructure.slides)) {
      for (const slide of pptStructure.slides) {
        const slideObj = pptx.addSlide();

        // Add title
        if (slide.title) {
          slideObj.addText(slide.title, {
            x: 1,
            y: 0.5,
            w: '90%',
            h: 1,
            fontSize: 32,
            bold: true,
            color: designGuidance.primaryColor || '000000',
            align: 'center',
          });
        }

        // Add content
        if (slide.content && Array.isArray(slide.content)) {
          let yPos = 2;
          
          for (const item of slide.content) {
            if (item.type === 'heading' || item.type === 'text') {
              slideObj.addText(item.text, {
                x: 1,
                y: yPos,
                w: '80%',
                h: 0.8,
                fontSize: item.type === 'heading' ? 24 : 18,
                bold: item.emphasis || false,
                color: designGuidance.textColor || '000000',
                align: 'left',
              });
              yPos += 1;
            } else if (item.type === 'bullet') {
              slideObj.addText(item.text, {
                x: 1,
                y: yPos,
                w: '80%',
                h: 0.8,
                fontSize: 16,
                bullet: true,
                color: designGuidance.textColor || '000000',
              });
              yPos += 1;
            }
          }
        }

        // Add slide number
        slideObj.addText(`${slide.slideNumber}`, {
          x: '90%',
          y: '90%',
          w: 0.5,
          h: 0.3,
          fontSize: 10,
          color: '999999',
        });
      }
    }

    // Generate PPTX buffer
    const buffer = await pptx.write({ outputType: 'nodebuffer', compression: true });

    // Ensure buffer is a Buffer instance
    if (!Buffer.isBuffer(buffer)) {
      throw new Error('Failed to generate PPTX buffer');
    }

    // Set headers for file download
    const filename = `${pptStructure.metadata?.title || 'presentation'}_${Date.now()}.pptx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Length', buffer.length);

    console.log('[PPT Export] PPTX generated successfully:', {
      filename,
      size: buffer.length,
    });

    // Send buffer
    res.send(buffer);

  } catch (error) {
    console.error('PPT export error:', error);
    res.status(500).json({
      error: 'Failed to export PPT',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/v1/ppt/analyze-lesson
 * Analyze uploaded lesson plan and extract key information
 */
router.post('/analyze-lesson', upload.single('lessonPlan'), async (req: Request, res: Response) => {
  try {
    const lessonPlanFile = req.file;

    if (!lessonPlanFile) {
      return res.status(400).json({
        error: 'No file uploaded',
        message: 'Please upload a lesson plan file',
      });
    }

    // Extract lesson plan content
    const lessonPlanContent = lessonPlanFile.buffer.toString('utf-8');

    // Initialize LLM client
    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers as Record<string, string>);
    const llmConfig = new Config();
    const client = new LLMClient(llmConfig, customHeaders);

    // Analyze lesson plan
    const messages = [
      {
        role: 'system' as const,
        content: '你是一位专业的教育专家，擅长分析和提取教案中的关键信息。',
      },
      {
        role: 'user' as const,
        content: `请分析以下教案内容，提取以下信息并以 JSON 格式返回：

1. 学科（subject）
2. 年级（grade）
3. 课程标题（lessonTitle）
4. 课程目标（lessonObjective）
5. 教学重点（teachingKeyPoints）
6. 目标学生（targetAudience）
7. 预计时长（estimatedDuration）

教案内容：
${lessonPlanContent}

请以 JSON 格式返回，格式如下：
{
  "subject": "学科",
  "grade": "年级",
  "lessonTitle": "课程标题",
  "lessonObjective": "课程目标",
  "teachingKeyPoints": "教学重点",
  "targetAudience": "目标学生",
  "estimatedDuration": "预计时长"
}`,
      },
    ];

    const response = await client.invoke(messages, {
      model: 'doubao-seed-2-0-pro-260215',
      temperature: 0.3,
    } as any);

    // Parse JSON response
    let analyzedData;
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analyzedData = JSON.parse(jsonMatch[0]);
      } else {
        analyzedData = {
          subject: '',
          grade: '',
          lessonTitle: '',
          lessonObjective: lessonPlanContent.substring(0, 200),
          teachingKeyPoints: lessonPlanContent,
          targetAudience: '小学生',
          estimatedDuration: '45分钟',
        };
      }
    } catch (parseError) {
      analyzedData = {
        subject: '',
        grade: '',
        lessonTitle: '',
        lessonObjective: lessonPlanContent.substring(0, 200),
        teachingKeyPoints: lessonPlanContent,
        targetAudience: '小学生',
        estimatedDuration: '45分钟',
      };
    }

    res.json({
      success: true,
      data: {
        analyzedData,
        rawContent: lessonPlanContent,
      },
    });

  } catch (error) {
    console.error('Lesson plan analysis error:', error);
    res.status(500).json({
      error: 'Failed to analyze lesson plan',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/v1/ppt/generate-preview-images
 * Generate preview images for PPT slides
 */
router.post('/generate-preview-images', async (req: Request, res: Response) => {
  try {
    const { pptStructure } = req.body;

    if (!pptStructure || !pptStructure.slides || !Array.isArray(pptStructure.slides)) {
      return res.status(400).json({
        error: 'Missing required field',
        message: 'pptStructure with slides array is required',
      });
    }

    // Initialize Image Generation client
    const customHeaders = HeaderUtils.extractForwardHeaders(req.headers as Record<string, string>);
    const config = new Config();
    const imageClient = new ImageGenerationClient(config, customHeaders);

    // Generate image for each slide
    const slidesWithImages = await Promise.all(
      pptStructure.slides.map(async (slide: any, index: number) => {
        try {
          // First, try to use the pre-defined imagePrompt from the slide content
          let prompt = '';
          const imageContentItem = slide.content?.find((item: any) => item.type === 'image' && item.imagePrompt);

          if (imageContentItem && imageContentItem.imagePrompt) {
            // Use the pre-defined detailed imagePrompt
            prompt = imageContentItem.imagePrompt;
          } else {
            // Fallback: create a descriptive prompt dynamically
            const slideTitle = slide.title || `Slide ${index + 1}`;
            const slideContent = slide.content
              .filter((item: any) => item.type === 'heading' || item.type === 'bullet')
              .map((item: any) => item.text)
              .join(', ');

            const designGuidance = pptStructure.designGuidance || {};
            const colorScheme = designGuidance.colorScheme || '现代简约';
            const visualStyle = designGuidance.visualStyle || '简洁';

            prompt = `A professional educational PowerPoint slide titled "${slideTitle}" with the content: "${slideContent}". 
Style: ${visualStyle} education presentation, ${colorScheme} color scheme, clean and modern design, 
16:9 aspect ratio, high quality, professional typography, suitable for classroom teaching.`;
          }

          // Generate image (use smaller size for preview)
          const imageResponse = await imageClient.generate({
            prompt,
            size: '1280x720', // 720p for preview
            watermark: false,
          });

          const imageHelper = imageClient.getResponseHelper(imageResponse);

          if (imageHelper.success && imageHelper.imageUrls.length > 0) {
            return {
              ...slide,
              imageUrl: imageHelper.imageUrls[0],
            };
          } else {
            // If image generation fails, return original slide
            console.warn(`Failed to generate image for slide ${index + 1}`);
            return slide;
          }
        } catch (error) {
          console.error(`Error generating image for slide ${index + 1}:`, error);
          return slide; // Return original slide if generation fails
        }
      })
    );

    res.json({
      success: true,
      data: {
        ...pptStructure,
        slides: slidesWithImages,
        previewGenerated: true,
      },
    });

  } catch (error) {
    console.error('PPT preview images generation error:', error);
    res.status(500).json({
      error: 'Failed to generate preview images',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
