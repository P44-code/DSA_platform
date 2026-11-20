import { Router } from 'express';
import mongoose from 'mongoose';
import * as z from 'zod';
import { ProblemModel } from '../models/Problem.js';
import { estimateComplexity, executeWithOneCompiler, type SupportedLanguage } from '../services/executor.js';

export const submissionRouter = Router();

const submissionWindowMs = 60_000;
const submissionLimit = 10;
const submissionBuckets = new Map<string, { count: number; expiresAt: number }>();

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

submissionRouter.post('/', async (request, response) => {
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

  const visibleTests = problem.tests.filter((test) => !test.hidden);
  const visibleResults = [];
  let passedHiddenTests = 0;
  let totalHiddenTests = 0;

  for (const test of problem.tests) {
    try {
      const execution = await executeWithOneCompiler(
        parsed.data.language as SupportedLanguage,
        parsed.data.code,
        test.input,
      );
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
    }
  }

  const passedVisibleCount = visibleResults.filter((result) => result.passed).length;
  const passedAllTests = passedVisibleCount === visibleResults.length &&
    passedHiddenTests === totalHiddenTests;
  const executionTimes = visibleResults.map((result) => result.executionTimeMs).filter((value): value is number => value !== null);
  const memoryValues = visibleResults.map((result) => result.memoryUsedKb).filter((value): value is number => value !== null);
  const totalExecutionTimeMs = executionTimes.reduce((sum, value) => sum + value, 0);
  const maxMemoryUsedKb = memoryValues.length ? Math.max(...memoryValues) : null;

  response.json({
    status: passedAllTests ? 'passed' : 'failed',
    passedTests: passedVisibleCount,
    totalTests: visibleTests.length,
    hiddenTestsPassed: passedHiddenTests,
    hiddenTestsTotal: totalHiddenTests,
    results: visibleResults,
    executionTimeMs: executionTimes.length
      ? Math.round(executionTimes.reduce((sum, value) => sum + value, 0) / executionTimes.length)
      : null,
    totalExecutionTimeMs: executionTimes.length ? totalExecutionTimeMs : null,
    memoryUsedKb: memoryValues.length
      ? Math.round(memoryValues.reduce((sum, value) => sum + value, 0) / memoryValues.length)
      : null,
    maxMemoryUsedKb,
    complexity: estimateComplexity(parsed.data.language as SupportedLanguage, parsed.data.code),
  });
});
