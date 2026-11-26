export type SupportedLanguage = 'javascript' | 'python' | 'java';

type OneCompilerResponse = {
  status?: 'success' | 'error';
  exception?: string | null;
  stdout?: string | null;
  stderr?: string | null;
  compilationTime?: number;
  executionTime?: number;
  memoryUsed?: number;
};

const fileNames: Record<SupportedLanguage, string> = {
  javascript: 'main.js',
  python: 'main.py',
  java: 'Main.java',
};

export async function executeWithOneCompiler(
  language: SupportedLanguage,
  code: string,
  stdin: string,
) {
  const host = process.env.ONECOMPILER_RAPIDAPI_HOST?.trim();
  const key = process.env.ONECOMPILER_RAPIDAPI_KEY?.trim();
  if (!host || !key) {
    throw new Error('OneCompiler credentials are missing. Set ONECOMPILER_RAPIDAPI_KEY in server/.env.');
  }

  const response = await fetch(`https://${host}/api/v1/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-RapidAPI-Host': host,
      'X-RapidAPI-Key': key,
    },
    body: JSON.stringify({
      language,
      stdin,
      files: [{ name: fileNames[language], content: code }],
    }),
    signal: AbortSignal.timeout(20000),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('Execution service is rate limited. Please retry shortly.');
    }
    throw new Error('Execution service unavailable. Please retry shortly.');
  }

  const data = await response.json() as OneCompilerResponse;
  if (data.status === 'error') {
    throw new Error(data.exception || data.stderr || 'Execution failed');
  }

  return {
    stdout: (data.stdout ?? '').trim(),
    stderr: data.stderr ?? data.exception ?? '',
    compilationTimeMs: data.compilationTime ?? null,
    executionTimeMs: data.executionTime ?? null,
    memoryUsedKb: data.memoryUsed ?? null,
  };
}

export function estimateComplexity(language: SupportedLanguage, code: string) {
  const source = code.toLowerCase();
  const loopCount = (source.match(/\b(for|while)\b/g) ?? []).length;
  const usesSort = /\b(sort|sorted)\b/.test(source);
  const allocatesCollection =
    /\b(list|array|arraylist|hashmap|map|set|dict|deque|vector)\b/.test(source) ||
    /\[.*for.*\]/.test(source) ||
    /\bnew\s+(int|long|string|integer|double|float|boolean|object)\s*\[/i.test(code);

  let time = 'O(1)';
  if (loopCount >= 2) time = 'O(n²)';
  else if (usesSort) time = 'O(n log n)';
  else if (loopCount === 1) time = 'O(n)';
  else if (language !== 'javascript' && /return\s+\w+\s*\([^;]*\w+\s*\(/.test(code)) time = 'O(n)';

  return {
    time,
    space: allocatesCollection ? 'O(n)' : 'O(1)',
    estimated: true,
  };
}
