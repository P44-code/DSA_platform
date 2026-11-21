import { Router } from 'express';
import mongoose from 'mongoose';
import * as z from 'zod';
import { ProblemModel } from '../models/Problem.js';
import { SubmissionModel } from '../models/Submission.js';
import { currentUser } from './auth.js';
import { estimateComplexity, executeWithOneCompiler, type SupportedLanguage } from '../services/executor.js';

export const submissionRouter = Router();

const submissionWindowMs = 60_000;
const submissionLimit = 10;
const submissionBuckets = new Map<string, { count: number; expiresAt: number }>();
let activeExecutions = 0;
const executionLimit = 4;

async function acquireExecutionSlot() {
  while (activeExecutions >= executionLimit) {
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  activeExecutions += 1;
}

submissionRouter.use((request, response, next) => {
  const now = Date.now();
  const key = request.ip || 'unknown';

  for (const [bucketKey, bucket] of submissionBuckets) {
    if (bucket.expiresAt <= now) submissionBuckets.delete(bucketKey);
  }

  const bucket = submissionBuckets.get(key);

  if (!bucket || bucket.expiresAt <= now) {
    submissionBuckets.set(key, { count: 1, expiresAt: now + submissionWindowMs });
    next();
    return;
  }

  if (bucket.count >= submissionLimit) {
    response.setHeader('Retry-After', Math.ceil((bucket.expiresAt - now) / 1000));
    response.status(429).json({ error: 'Submission limit reached. Try again shortly.' });
    return;
  }

  bucket.count += 1;
  next();
});

const submissionSchema = z.object({
  problemId: z.string().trim().min(1),
  language: z.enum(['javascript', 'python', 'java']),
  code: z.string().min(1).max(50000),
});

const clientIdSchema = z.string().trim().min(16).max(128);

submissionRouter.get('/', async (request, response) => {
  const parsedClientId = clientIdSchema.safeParse(request.header('x-client-id'));
  let user = null;
  try {
    user = await currentUser(request.headers.cookie);
  } catch {
    response.status(503).json({ error: 'Submission history unavailable' });
    return;
  }
  if (!user && !parsedClientId.success) {
    response.status(400).json({ error: 'A valid client ID is required' });
    return;
  }
  if (mongoose.connection.readyState !== 1) {
    response.json([]);
    return;
  }

  try {
    if (user && parsedClientId.success) {
      await SubmissionModel.updateMany(
        { clientId: parsedClientId.data, userId: { $exists: false } },
        { $set: { userId: user._id } },
      );
    }
    const query = SubmissionModel.find({});
    if (user) {
      query.where('userId').equals(user._id);
    } else {
      query.where('clientId').equals(parsedClientId.data);
    }
    const submissions = await query.select({
      _id: 1,
      problemSlug: 1,
      language: 1,
      status: 1,
      passedTests: 1,
      totalTests: 1,
      executionTimeMs: 1,
      memoryUsedKb: 1,
      createdAt: 1,
    }).sort({ createdAt: -1 }).limit(20).lean();

    response.json(submissions);
  } catch {
    response.status(503).json({ error: 'Submission history unavailable' });
  }
});

async function processSubmission(
  submissionId: string,
  problem: { slug: string; tests: Array<{ input: string; expectedOutput: string; hidden: boolean }> },
  language: SupportedLanguage,
  code: string,
) {
  await SubmissionModel.updateOne({ _id: submissionId }, { $set: { status: 'running' } });
  const visibleTests = problem.tests.filter((test) => !test.hidden);
  const visibleResults = [];
  let passedHiddenTests = 0;
  let totalHiddenTests = 0;

  for (const test of problem.tests) {
    await acquireExecutionSlot();
    try {
      const execution = await executeWithOneCompiler(language, code, test.input);
      const actual = execution.stdout.trim();
      const passed = actual === test.expectedOutput.trim() && !execution.stderr;
      const result = {
        input: test.input,
        expectedOutput: test.expectedOutput,
        actualOutput: actual,
        passed,
        stderr: execution.stderr || null,
        executionTimeMs: execution.executionTimeMs,
        compilationTimeMs: execution.compilationTimeMs,
        memoryUsedKb: execution.memoryUsedKb,
      };
      if (test.hidden) {
        totalHiddenTests += 1;
        if (passed) passedHiddenTests += 1;
      } else {
        visibleResults.push(result);
      }
    } catch (error) {
      if (test.hidden) {
        totalHiddenTests += 1;
      } else {
        visibleResults.push({
          input: test.input,
          expectedOutput: test.expectedOutput,
          actualOutput: '',
          passed: false,
          stderr: error instanceof Error ? error.message : 'Execution failed',
          executionTimeMs: null,
          compilationTimeMs: null,
          memoryUsedKb: null,
        });
      }
    } finally {
      activeExecutions -= 1;
    }
  }

  const passedVisibleCount = visibleResults.filter((result) => result.passed).length;
  const executionTimes = visibleResults.map((result) => result.executionTimeMs).filter((value): value is number => value !== null);
  const memoryValues = visibleResults.map((result) => result.memoryUsedKb).filter((value): value is number => value !== null);
  const passedAllTests = passedVisibleCount === visibleTests.length &&
    passedHiddenTests === totalHiddenTests;

  await SubmissionModel.updateOne({ _id: submissionId }, {
    $set: {
      status: passedAllTests ? 'passed' : 'failed',
      passedTests: passedVisibleCount,
      totalTests: visibleTests.length,
      hiddenTestsPassed: passedHiddenTests,
      hiddenTestsTotal: totalHiddenTests,
      results: visibleResults,
      executionTimeMs: executionTimes.length
        ? Math.round(executionTimes.reduce((sum, value) => sum + value, 0) / executionTimes.length)
        : null,
      totalExecutionTimeMs: executionTimes.length
        ? executionTimes.reduce((sum, value) => sum + value, 0)
        : null,
      memoryUsedKb: memoryValues.length
        ? Math.round(memoryValues.reduce((sum, value) => sum + value, 0) / memoryValues.length)
        : null,
      maxMemoryUsedKb: memoryValues.length ? Math.max(...memoryValues) : null,
      complexity: estimateComplexity(language, code),
    },
  });
}

submissionRouter.get('/:id/status', async (request, response) => {
  if (mongoose.connection.readyState !== 1) {
    response.status(503).json({ error: 'Submission service unavailable' });
    return;
  }
  if (!mongoose.isValidObjectId(request.params.id)) {
    response.status(404).json({ error: 'Submission not found' });
    return;
  }
  const user = await currentUser(request.headers.cookie);
  const clientId = clientIdSchema.safeParse(request.header('x-client-id'));
  const submission = await SubmissionModel.findById(request.params.id);
  if (!submission) {
    response.status(404).json({ error: 'Submission not found' });
    return;
  }
  if (user ? String(submission.userId) !== String(user._id) : !clientId.success || submission.clientId !== clientId.data) {
    response.status(404).json({ error: 'Submission not found' });
    return;
  }
  response.json(submission);
});

submissionRouter.post('/', async (request, response) => {
  if (mongoose.connection.readyState !== 1) {
    response.status(503).json({ error: 'Database-backed submissions are temporarily unavailable.' });
    return;
  }
  const parsed = submissionSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({
      error: 'Invalid submission',
      details: parsed.error.issues.map((issue) => issue.message),
    });
    return;
  }
  const problem = mongoose.isValidObjectId(parsed.data.problemId)
    ? await ProblemModel.findById(parsed.data.problemId)
    : await ProblemModel.findOne({ slug: parsed.data.problemId });
  if (!problem) {
    response.status(404).json({ error: 'Problem not found' });
    return;
  }
  if (mongoose.connection.readyState !== 1) {
    response.status(503).json({ error: 'Submission service unavailable' });
    return;
  }

  const clientId = clientIdSchema.safeParse(request.header('x-client-id'));
  let user = null;
  try {
    user = await currentUser(request.headers.cookie);
  } catch {
    user = null;
  }
  const submission = await SubmissionModel.create({
    ...(clientId.success ? { clientId: clientId.data } : {}),
    ...(user ? { userId: user._id } : {}),
    status: 'queued',
    problemId: String(problem._id),
    problemSlug: problem.slug,
    language: parsed.data.language,
  });
  setImmediate(() => {
    void processSubmission(
      String(submission._id),
      problem,
      parsed.data.language as SupportedLanguage,
      parsed.data.code,
    ).catch(async (error: unknown) => {
      console.error('Submission processing failed:', error);
      await SubmissionModel.updateOne(
        { _id: submission._id },
        { $set: { status: 'failed', passedTests: 0 } },
      );
    });
  });
  response.status(202).json({ submissionId: String(submission._id), status: 'queued' });
});
