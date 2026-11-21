export type FallbackProblem = {
  _id: string;
  slug: string;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  statement: string;
  starterCode: Record<'javascript' | 'python' | 'java', string>;
  tests: Array<{ input: string; expectedOutput: string }>;
};

const starterCode = {
  javascript: 'const fs = require("fs");\n\nfunction solve(input) {\n  // Write your solution\n  return "";\n}\n\nconsole.log(solve(fs.readFileSync(0, "utf8").trim()));\n',
  python: 'import sys\n\ndef solve(input):\n    # Write your solution\n    return ""\n\nprint(solve(sys.stdin.read().strip()))\n',
  java: 'import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        String input = scanner.hasNextLine() ? scanner.nextLine() : "";\n        System.out.print(solve(input));\n    }\n\n    public static String solve(String input) {\n        // Write your solution\n        return "";\n    }\n}\n',
};

export const fallbackProblems: FallbackProblem[] = [
  { _id: 'two-sum', slug: 'two-sum', title: 'Two Sum', difficulty: 'easy', statement: 'Given two integers separated by a space, return their sum.', starterCode, tests: [{ input: '2 3', expectedOutput: '5' }, { input: '-4 9', expectedOutput: '5' }] },
  { _id: 'palindrome-check', slug: 'palindrome-check', title: 'Palindrome Check', difficulty: 'easy', statement: 'Return true if the input string reads the same forward and backward, otherwise return false.', starterCode, tests: [{ input: 'madam', expectedOutput: 'true' }, { input: 'hello', expectedOutput: 'false' }] },
  { _id: 'array-maximum', slug: 'array-maximum', title: 'Array Maximum', difficulty: 'easy', statement: 'Given space-separated integers, return the largest integer.', starterCode, tests: [{ input: '1 4 3', expectedOutput: '4' }, { input: '-8 -2 -5', expectedOutput: '-2' }] },
  { _id: 'count-vowels', slug: 'count-vowels', title: 'Count Vowels', difficulty: 'easy', statement: 'Count the vowels a, e, i, o, and u in the input string, ignoring case.', starterCode, tests: [{ input: 'hello', expectedOutput: '2' }, { input: 'rhythm', expectedOutput: '0' }] },
  { _id: 'reverse-string', slug: 'reverse-string', title: 'Reverse String', difficulty: 'easy', statement: 'Return the input string in reverse character order.', starterCode, tests: [{ input: 'abc', expectedOutput: 'cba' }, { input: 'hello', expectedOutput: 'olleh' }] },
  { _id: 'fizzbuzz', slug: 'fizzbuzz', title: 'FizzBuzz', difficulty: 'easy', statement: 'For the integer n, print FizzBuzz for multiples of 15, Fizz for multiples of 3, Buzz for multiples of 5, otherwise print n.', starterCode, tests: [{ input: '15', expectedOutput: 'FizzBuzz' }, { input: '9', expectedOutput: 'Fizz' }] },
  { _id: 'count-character', slug: 'count-character', title: 'Count Character', difficulty: 'easy', statement: 'Given a character and a string separated by a space, count exact case-sensitive character occurrences.', starterCode, tests: [{ input: 'a banana', expectedOutput: '3' }, { input: 'z zebra', expectedOutput: '1' }] },
  { _id: 'factorial', slug: 'factorial', title: 'Factorial', difficulty: 'easy', statement: 'Return the factorial of a non-negative integer n.', starterCode, tests: [{ input: '5', expectedOutput: '120' }, { input: '0', expectedOutput: '1' }] },
  { _id: 'even-or-odd', slug: 'even-or-odd', title: 'Even or Odd', difficulty: 'easy', statement: 'Return even if the integer is divisible by 2, otherwise return odd.', starterCode, tests: [{ input: '8', expectedOutput: 'even' }, { input: '3', expectedOutput: 'odd' }] },
  { _id: 'sum-of-array', slug: 'sum-of-array', title: 'Sum of Array', difficulty: 'easy', statement: 'Given space-separated integers, return their sum.', starterCode, tests: [{ input: '1 2 3', expectedOutput: '6' }, { input: '-5 5 10', expectedOutput: '10' }] },
];
