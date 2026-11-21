import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

export interface Submission {
  clientId?: string;
  userId?: mongoose.Types.ObjectId;
  status: 'queued' | 'running' | 'passed' | 'failed';
  problemId: string;
  problemSlug: string;
  language: 'javascript' | 'python' | 'java';
  passedTests?: number;
  totalTests?: number;
  hiddenTestsPassed?: number;
  hiddenTestsTotal?: number;
  results?: Array<{
    input: string;
    expectedOutput: string;
    actualOutput: string;
    passed: boolean;
    stderr: string | null;
    executionTimeMs: number | null;
    compilationTimeMs: number | null;
    memoryUsedKb: number | null;
  }>;
  executionTimeMs: number | null;
  totalExecutionTimeMs: number | null;
  memoryUsedKb: number | null;
  maxMemoryUsedKb: number | null;
  complexity?: {
    time: string;
    space: string;
  };
}

const submissionSchema = new Schema<Submission>({
  clientId: { type: String, sparse: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', sparse: true, index: true },
  status: { type: String, enum: ['queued', 'running', 'passed', 'failed'], required: true, index: true },
  problemId: { type: String, required: true },
  problemSlug: { type: String, required: true, index: true },
  language: { type: String, enum: ['javascript', 'python', 'java'], required: true },
  passedTests: { type: Number, default: null },
  totalTests: { type: Number, default: null },
  hiddenTestsPassed: { type: Number, default: null },
  hiddenTestsTotal: { type: Number, default: null },
  results: [{
    input: String,
    expectedOutput: String,
    actualOutput: String,
    passed: Boolean,
    stderr: { type: String, default: null },
    executionTimeMs: { type: Number, default: null },
    compilationTimeMs: { type: Number, default: null },
    memoryUsedKb: { type: Number, default: null },
  }],
  executionTimeMs: { type: Number, default: null },
  totalExecutionTimeMs: { type: Number, default: null },
  memoryUsedKb: { type: Number, default: null },
  maxMemoryUsedKb: { type: Number, default: null },
  complexity: {
    time: { type: String, default: null },
    space: { type: String, default: null },
  },
}, { timestamps: true });

submissionSchema.index({ clientId: 1, createdAt: -1 });

export const SubmissionModel =
  (models.Submission as mongoose.Model<Submission> | undefined) ??
  model<Submission>('Submission', submissionSchema);
