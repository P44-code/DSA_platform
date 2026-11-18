import 'dotenv/config';
import mongoose from 'mongoose';
import { ProblemModel, type Problem } from '../models/Problem.js';
import { connectDatabase } from '../services/database.js';

const starterCode = new Map([
  ['javascript', 'function solve(input) {\n  // Write your solution\n}\n'],
  ['python', 'def solve(input):\n    # Write your solution\n'],
]);

const problems: Problem[] = [
  {
    slug: 'two-sum',
    title: 'Two Sum',
    statement: 'Given two integers separated by a space, return their sum.',
    difficulty: 'easy',
    starterCode,
    tests: [
      { input: '2 3', expectedOutput: '5', hidden: false },
      { input: '-4 9', expectedOutput: '5', hidden: false },
      { input: '100 250', expectedOutput: '350', hidden: true },
      { input: '0 0', expectedOutput: '0', hidden: true },
      { input: '17 -17', expectedOutput: '0', hidden: true },
    ],
  },
  {
    slug: 'palindrome-check',
    title: 'Palindrome Check',
    statement: 'Return true if the input string reads the same forward and backward, otherwise return false.',
    difficulty: 'easy',
    starterCode,
    tests: [
      { input: 'madam', expectedOutput: 'true', hidden: false },
      { input: 'hello', expectedOutput: 'false', hidden: false },
      { input: 'racecar', expectedOutput: 'true', hidden: true },
      { input: 'level', expectedOutput: 'true', hidden: true },
      { input: 'world', expectedOutput: 'false', hidden: true },
    ],
  },
  {
    slug: 'array-maximum',
    title: 'Array Maximum',
    statement: 'Given space-separated integers, return the largest integer.',
    difficulty: 'easy',
    starterCode,
    tests: [
      { input: '1 4 3', expectedOutput: '4', hidden: false },
      { input: '-8 -2 -5', expectedOutput: '-2', hidden: false },
      { input: '10 10 10', expectedOutput: '10', hidden: true },
      { input: '0 -100 25', expectedOutput: '25', hidden: true },
      { input: '99 1 42', expectedOutput: '99', hidden: true },
    ],
  },
  {
    slug: 'count-vowels',
    title: 'Count Vowels',
    statement: 'Count the vowels a, e, i, o, and u in the input string, ignoring case.',
    difficulty: 'easy',
    starterCode,
    tests: [
      { input: 'hello', expectedOutput: '2', hidden: false },
      { input: 'rhythm', expectedOutput: '0', hidden: false },
      { input: 'AEIOU', expectedOutput: '5', hidden: true },
      { input: 'VerdictAI', expectedOutput: '4', hidden: true },
      { input: 'coding', expectedOutput: '2', hidden: true },
    ],
  },
  {
    slug: 'reverse-string',
    title: 'Reverse String',
    statement: 'Return the input string in reverse character order.',
    difficulty: 'easy',
    starterCode,
    tests: [
      { input: 'abc', expectedOutput: 'cba', hidden: false },
      { input: 'hello', expectedOutput: 'olleh', hidden: false },
      { input: '12345', expectedOutput: '54321', hidden: true },
      { input: 'a', expectedOutput: 'a', hidden: true },
      { input: '  ok', expectedOutput: 'ko  ', hidden: true },
    ],
  },
  {
    slug: 'fizzbuzz',
    title: 'FizzBuzz',
    statement: 'For the integer n, print FizzBuzz for multiples of 15, Fizz for multiples of 3, Buzz for multiples of 5, otherwise print n.',
    difficulty: 'easy',
    starterCode,
    tests: [
      { input: '15', expectedOutput: 'FizzBuzz', hidden: false },
      { input: '9', expectedOutput: 'Fizz', hidden: false },
      { input: '10', expectedOutput: 'Buzz', hidden: true },
      { input: '7', expectedOutput: '7', hidden: true },
      { input: '30', expectedOutput: 'FizzBuzz', hidden: true },
    ],
  },
  {
    slug: 'count-character',
    title: 'Count Character',
    statement: 'Given a character and a string separated by a space, count exact case-sensitive character occurrences.',
    difficulty: 'easy',
    starterCode,
    tests: [
      { input: 'a banana', expectedOutput: '3', hidden: false },
      { input: 'z zebra', expectedOutput: '1', hidden: false },
      { input: 'A Apple', expectedOutput: '0', hidden: true },
      { input: 'l hello', expectedOutput: '2', hidden: true },
      { input: 'x xxxx', expectedOutput: '4', hidden: true },
    ],
  },
  {
    slug: 'factorial',
    title: 'Factorial',
    statement: 'Return the factorial of a non-negative integer n.',
    difficulty: 'easy',
    starterCode,
    tests: [
      { input: '5', expectedOutput: '120', hidden: false },
      { input: '0', expectedOutput: '1', hidden: false },
      { input: '1', expectedOutput: '1', hidden: true },
      { input: '7', expectedOutput: '5040', hidden: true },
      { input: '10', expectedOutput: '3628800', hidden: true },
    ],
  },
  {
    slug: 'even-or-odd',
    title: 'Even or Odd',
    statement: 'Return even if the integer is divisible by 2, otherwise return odd.',
    difficulty: 'easy',
    starterCode,
    tests: [
      { input: '8', expectedOutput: 'even', hidden: false },
      { input: '3', expectedOutput: 'odd', hidden: false },
      { input: '0', expectedOutput: 'even', hidden: true },
      { input: '-2', expectedOutput: 'even', hidden: true },
      { input: '-7', expectedOutput: 'odd', hidden: true },
    ],
  },
  {
    slug: 'sum-of-array',
    title: 'Sum of Array',
    statement: 'Given space-separated integers, return their sum.',
    difficulty: 'easy',
    starterCode,
    tests: [
      { input: '1 2 3', expectedOutput: '6', hidden: false },
      { input: '-5 5 10', expectedOutput: '10', hidden: false },
      { input: '0 0 0', expectedOutput: '0', hidden: true },
      { input: '100 -25', expectedOutput: '75', hidden: true },
      { input: '1 1 1 1', expectedOutput: '4', hidden: true },
    ],
  },
];

await connectDatabase();

for (const problem of problems) {
  await ProblemModel.updateOne({ slug: problem.slug }, { $set: problem }, { upsert: true });
}

console.log(`Seeded ${problems.length} problems`);
await mongoose.disconnect();
