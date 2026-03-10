import express from "express";
import cors from "cors";
import lessonPlansRouter from "./routes/lesson-plans";
import exportWordRouter from "./routes/export-word";
import lessonPlansStreamRouter from "./routes/lesson-plans-stream";
import regenerateOptionsRouter from "./routes/regenerate-options";
import knowledgePointsRouter from "./routes/knowledge-points";
import adjustOptionRouter from "./routes/adjust-option";
import teacherNamesRouter from "./routes/teacher-names";
import voiceRouter from "./routes/voice";
import quotesRouter from "./routes/quotes";
import pptGenerationRouter from "./routes/ppt-generation";

const app = express();
const port = process.env.PORT || 9091;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Health check
app.get('/api/v1/health', (req, res) => {
  console.log('Health check success');
  res.status(200).json({ status: 'ok' });
});

// Lesson plans routes
app.use('/api/v1/lesson-plans', lessonPlansRouter);
app.use('/api/v1/lesson-plans', exportWordRouter);
app.use('/api/v1/lesson-plans', lessonPlansStreamRouter);
app.use('/api/v1/lesson-plans', regenerateOptionsRouter);
app.use('/api/v1/lesson-plans', knowledgePointsRouter);
app.use('/api/v1/lesson-plans', adjustOptionRouter);

// Teacher names routes
app.use('/api/v1/teacher-names', teacherNamesRouter);

// Voice routes
app.use('/api/v1/voice', voiceRouter);

// Quotes routes
app.use('/api/v1/quotes', quotesRouter);

// PPT generation routes
app.use('/api/v1/ppt', pptGenerationRouter);

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}/`);
});
