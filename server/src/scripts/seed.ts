import mongoose from 'mongoose';
import fs from 'node:fs';
import '../config/env.js';
import { ProblemModel, type Problem } from '../models/Problem.js';
import { connectDatabase } from '../services/database.js';

const starterCode = new Map([
  ['javascript', 'const fs = require("fs");\n\nfunction solve(input) {\n  // Write your solution\n  return "";\n}\n\nconsole.log(solve(fs.readFileSync(0, "utf8").trim()));\n'],
  ['python', 'import sys\n\ndef solve(input):\n    # Write your solution\n    return ""\n\nprint(solve(sys.stdin.read().strip()))\n'],
  ['java', 'import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        String input = scanner.hasNextLine() ? scanner.nextLine() : \"\";\n        System.out.print(solve(input));\n    }\n\n    public static String solve(String input) {\n        // Write your solution\n        return \"\";\n    }\n}\n'],
]);

const problems: Problem[] = [
  { slug: 'two-sum', title: 'Two Sum', statement: 'Given two integers separated by a space, return their sum.', difficulty: 'easy', starterCode, tests: [{ input: '2 3', expectedOutput: '5', hidden: false }, { input: '-4 9', expectedOutput: '5', hidden: false }] },
  { slug: 'palindrome-check', title: 'Palindrome Check', statement: 'Return true if the input string reads the same forward and backward, otherwise return false.', difficulty: 'easy', starterCode, tests: [{ input: 'madam', expectedOutput: 'true', hidden: false }, { input: 'hello', expectedOutput: 'false', hidden: false }] },
  { slug: 'array-maximum', title: 'Array Maximum', statement: 'Given space-separated integers, return the largest integer.', difficulty: 'easy', starterCode, tests: [{ input: '1 4 3', expectedOutput: '4', hidden: false }, { input: '-8 -2 -5', expectedOutput: '-2', hidden: false }] },
  { slug: 'count-vowels', title: 'Count Vowels', statement: 'Count the vowels a, e, i, o, and u in the input string, ignoring case.', difficulty: 'easy', starterCode, tests: [{ input: 'hello', expectedOutput: '2', hidden: false }, { input: 'rhythm', expectedOutput: '0', hidden: false }] },
  { slug: 'reverse-string', title: 'Reverse String', statement: 'Return the input string in reverse character order.', difficulty: 'easy', starterCode, tests: [{ input: 'abc', expectedOutput: 'cba', hidden: false }, { input: 'hello', expectedOutput: 'olleh', hidden: false }] },
  { slug: 'fizzbuzz', title: 'FizzBuzz', statement: 'For the integer n, print FizzBuzz for multiples of 15, Fizz for multiples of 3, Buzz for multiples of 5, otherwise print n.', difficulty: 'easy', starterCode, tests: [{ input: '15', expectedOutput: 'FizzBuzz', hidden: false }, { input: '9', expectedOutput: 'Fizz', hidden: false }] },
  { slug: 'count-character', title: 'Count Character', statement: 'Given a character and a string separated by a space, count exact case-sensitive character occurrences.', difficulty: 'easy', starterCode, tests: [{ input: 'a banana', expectedOutput: '3', hidden: false }, { input: 'z zebra', expectedOutput: '1', hidden: false }] },
  { slug: 'factorial', title: 'Factorial', statement: 'Return the factorial of a non-negative integer n.', difficulty: 'easy', starterCode, tests: [{ input: '5', expectedOutput: '120', hidden: false }, { input: '0', expectedOutput: '1', hidden: false }] },
  { slug: 'even-or-odd', title: 'Even or Odd', statement: 'Return even if the integer is divisible by 2, otherwise return odd.', difficulty: 'easy', starterCode, tests: [{ input: '8', expectedOutput: 'even', hidden: false }, { input: '3', expectedOutput: 'odd', hidden: false }] },
  { slug: 'sum-of-array', title: 'Sum of Array', statement: 'Given space-separated integers, return their sum.', difficulty: 'easy', starterCode, tests: [{ input: '1 2 3', expectedOutput: '6', hidden: false }, { input: '-5 5 10', expectedOutput: '10', hidden: false }] },
];

function loadHiddenTests() {
  const file = process.env.HIDDEN_TESTS_FILE?.trim() || './hidden-tests.json';
  try {
    const resolved = new URL(file, new URL('../../', import.meta.url));
    const value = JSON.parse(fs.readFileSync(resolved, 'utf8')) as Record<string, Array<{ input: string; expectedOutput: string }>>;
    return new Map(Object.entries(value).map(([slug, tests]) => [
      slug,
      tests.map((test) => ({ ...test, hidden: true as const })),
    ]));
  } catch {
    console.error('Hidden test file could not be loaded. Only visible tests will be seeded.');
    return new Map<string, Array<{ input: string; expectedOutput: string; hidden: true }>>();
  }
}

try {
  await connectDatabase({ required: true });
  const hiddenTests = loadHiddenTests();
  for (const problem of problems) {
    problem.tests = [...problem.tests, ...(hiddenTests.get(problem.slug) ?? [])];
    await ProblemModel.updateOne({ slug: problem.slug }, { $set: problem }, { upsert: true });
  }
  console.log(`Seeded ${problems.length} problems`);
} catch (error) {
  console.error('Seed failed: MongoDB could not be reached.');
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
}
