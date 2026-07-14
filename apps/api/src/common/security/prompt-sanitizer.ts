/**
 * Prompt-injection himoyasi (master-spec 16-bo'lim). Foydalanuvchi savolidan
 * AI system-promptini buzishga urinadigan iboralarni neytrallashtiradi.
 * Huquqiy savollarni buzmaslik uchun konservativ ishlaydi — faqat aniq
 * "jailbreak" naqshlarini olib tashlaydi.
 */

const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?(previous|above|prior)\s+(instructions|prompts?)/gi,
  /disregard\s+(all\s+)?(previous|above|the)\s+(instructions|rules)/gi,
  /you\s+are\s+now\s+(a|an|the)\b/gi,
  /act\s+as\s+(if\s+you\s+are\s+)?(a|an|the|developer|admin)/gi,
  /(reveal|show|print|repeat)\s+(your\s+)?(system\s+)?(prompt|instructions)/gi,
  /forget\s+(everything|all|your\s+instructions)/gi,
  /\b(jailbreak|DAN\s+mode|developer\s+mode)\b/gi,
  // Ruscha
  /игнорируй\s+(все\s+)?(предыдущие|вышеуказанные)\s+(инструкции|правила)/gi,
  /(покажи|раскрой|выведи)\s+(свой\s+)?(системный\s+)?(промпт|инструкции)/gi,
  // Prompt chegaralarini buzishga urinish
  /<\/?(system|assistant|user)>/gi,
  /\[\/?(INST|SYS|system|assistant)\]/gi,
];

const MAX_LENGTH = 8000;

/**
 * Nazorat belgilarini olib tashlaydi (\t=9, \n=10, \r=13 dan tashqari).
 * Literal control-belgilardan qochish uchun char-code bo'yicha filtrlaydi.
 */
function stripControlChars(input: string): string {
  let out = '';
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    const isControl =
      (code >= 0x00 && code <= 0x08) ||
      code === 0x0b ||
      code === 0x0c ||
      (code >= 0x0e && code <= 0x1f) ||
      code === 0x7f;
    if (!isControl) out += input[i];
  }
  return out;
}

export interface SanitizeResult {
  text: string;
  injectionDetected: boolean;
}

export function sanitizePrompt(input: string): SanitizeResult {
  if (!input) return { text: '', injectionDetected: false };

  let text = stripControlChars(input).slice(0, MAX_LENGTH);

  let injectionDetected = false;
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(text)) {
      injectionDetected = true;
      text = text.replace(pattern, '[olib tashlandi]');
    }
  }

  return { text: text.trim(), injectionDetected };
}
