import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

export interface ProblemTest {
  input: string;
  expectedOutput: string;
  hidden: boolean;
}

export interface Problem {
  slug: string;
  title: string;
  statement: string;
  difficulty: 'easy' | 'medium' | 'hard';
  starterCode: Map<string, string>;
  tests: ProblemTest[];
}

const problemSchema = new Schema<Problem>({
  slug: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true },
  statement: { type: String, required: true },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
  starterCode: { type: Map, of: String, required: true },
  tests: [{
    input: { type: String, required: true },
    expectedOutput: { type: String, required: true },
    hidden: { type: Boolean, required: true },
  }],
}, { timestamps: true });

export const ProblemModel =
  (models.Problem as mongoose.Model<Problem> | undefined) ??
  model<Problem>('Problem', problemSchema);
