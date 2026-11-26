import { Router } from 'express';
import mongoose from 'mongoose';
import { ProblemModel } from '../models/Problem.js';
import { fallbackProblems } from '../services/fallbackProblems.js';

export const problemRouter = Router();

problemRouter.get('/', async (_request, response) => {
  if (mongoose.connection.readyState !== 1) {
    response.json(fallbackProblems.map(({ _id, slug, title, difficulty, statement }) => ({
      _id,
      slug,
      title,
      difficulty,
      statement,
    })));
    return;
  }
  try {
    const problems = await ProblemModel.find(
      {},
      { slug: 1, title: 1, difficulty: 1, statement: 1 },
    ).sort({ createdAt: 1 });

    response.json(problems);
  } catch (error) {
    response.status(503).json({
      error: 'Database unavailable',
    });
  }
});

problemRouter.get('/:id', async (request, response) => {
  if (mongoose.connection.readyState !== 1) {
    const problem = fallbackProblems.find((item) =>
      item.slug === request.params.id || item._id === request.params.id,
    );
    if (!problem) {
      response.status(404).json({ error: 'Problem not found' });
      return;
    }
    response.json({
      _id: problem._id,
      slug: problem.slug,
      title: problem.title,
      statement: problem.statement,
      difficulty: problem.difficulty,
      starterCode: problem.starterCode,
      tests: problem.tests,
    });
    return;
  }
  try {
    const problem = mongoose.isValidObjectId(request.params.id)
      ? await ProblemModel.findById(request.params.id)
      : await ProblemModel.findOne({ slug: request.params.id });

    if (!problem) {
      response.status(404).json({ error: 'Problem not found' });
      return;
    }

    response.json({
      _id: problem._id,
      slug: problem.slug,
      title: problem.title,
      statement: problem.statement,
      difficulty: problem.difficulty,
      starterCode: Object.fromEntries(problem.starterCode),
      tests: problem.tests.filter((test) => !test.hidden).map((test) => ({
        input: test.input,
        expectedOutput: test.expectedOutput,
      })),
    });
  } catch {
    response.status(503).json({ error: 'Database unavailable' });
  }
});
