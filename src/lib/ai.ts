import "server-only";

const GEMINI_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-3.8-flash";
const TIMEOUT_MS = 20_000;
const MAX_WORD_LENGTH = 100;
const SERVER_RETRY_DELAY_MS = 2_000;

const SYSTEM_INSTRUCTION = `Bạn là giáo viên tiếng Nhật dạy cho người Việt. Người dùng đưa một từ hoặc cụm từ tiếng Nhật thuộc BẤT KỲ chủ đề nào (đời sống hằng ngày, công việc, học thuật, kính ngữ...). Trả về DUY NHẤT một JSON { "reading": "...", "meaningVi": "...", "example": "...", "exampleVi": "..." }. reading là cách đọc của toàn bộ từ bằng hiragana khi từ có chứa chữ Hán; nếu từ chỉ gồm hiragana hoặc katakana (không có chữ Hán) thì reading PHẢI là chuỗi rỗng ""; meaningVi là nghĩa tiếng Việt ngắn gọn, nếu có nhiều nghĩa thì ghi tối đa 3 nghĩa chính cách nhau bằng dấu chấm phẩy, kèm ghi chú trong ngoặc về loại từ hoặc sắc thái khi cần (ví dụ khiêm nhường ngữ, kính ngữ, suồng sã); example là MỘT câu ví dụ tự nhiên, đơn giản, có dùng đúng từ đó, trong ngữ cảnh phù hợp nhất với từ (đời sống hay công việc đều được, không ép vào công sở); exampleVi là bản dịch tiếng Việt của câu đó.`;

const INVALID_RESPONSE =
  "AI trả về dữ liệu không hợp lệ. Hãy thử lại.";
const SERVER_OVERLOADED =
  "Máy chủ AI đang quá tải, hãy thử lại sau ít phút";

export type GeneratedCard = {
  reading: string;
  meaningVi: string;
  example: string;
  exampleVi: string;
};

export type GenerateCardResult =
  | { ok: true; card: GeneratedCard }
  | { ok: false; error: string };

type RequestResult =
  | { ok: true; card: GeneratedCard }
  | {
      ok: false;
      error: string;
      retryable: boolean;
      retryDelayMs?: number;
    };

export async function generateCard(
  word: string,
): Promise<GenerateCardResult> {
  const trimmed = word.trim();

  if (!trimmed) return { ok: false, error: "Vui lòng nhập từ cần tạo." };
  if (trimmed.length > MAX_WORD_LENGTH) {
    return {
      ok: false,
      error: `Từ tối đa ${MAX_WORD_LENGTH} ký tự.`,
    };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      error: "Chưa cấu hình GEMINI_API_KEY trong .env.",
    };
  }

  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;

  const first = await requestCard(trimmed, model, apiKey);
  if (first.ok) return first;
  if (!first.retryable) return { ok: false, error: first.error };

  if (first.retryDelayMs) await delay(first.retryDelayMs);

  const second = await requestCard(trimmed, model, apiKey);
  if (second.ok) return second;
  if (second.retryDelayMs) {
    return { ok: false, error: SERVER_OVERLOADED };
  }
  return { ok: false, error: second.error };
}

async function requestCard(
  word: string,
  model: string,
  apiKey: string,
): Promise<RequestResult> {
  let response: Response;

  try {
    response = await fetch(
      `${GEMINI_BASE_URL}/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
          contents: [{ role: "user", parts: [{ text: word }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.3,
          },
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache: "no-store",
      },
    );
  } catch {
    return {
      ok: false,
      error: "AI không phản hồi kịp (quá 20 giây) hoặc lỗi mạng. Hãy thử lại.",
      retryable: false,
    };
  }

  if (!response.ok) {
    const info = await describeHttpError(response);
    return {
      ok: false,
      error: info.error,
      retryable: info.retryDelayMs !== undefined,
      retryDelayMs: info.retryDelayMs,
    };
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return { ok: false, error: INVALID_RESPONSE, retryable: true };
  }

  const text = extractText(payload);
  const parsed = text === null ? null : parseCard(text);
  const card = parsed ? normalizeReading(parsed, word) : null;

  if (!card) return { ok: false, error: INVALID_RESPONSE, retryable: true };
  return { ok: true, card };
}

type HttpErrorInfo = { error: string; retryDelayMs?: number };

async function describeHttpError(response: Response): Promise<HttpErrorInfo> {
  if (response.status === 429) {
    return { error: "Hết lượt miễn phí, thử lại sau ít phút." };
  }

  if (response.status === 500 || response.status === 503) {
    return { error: SERVER_OVERLOADED, retryDelayMs: SERVER_RETRY_DELAY_MS };
  }

  const body = await response.text().catch(() => "");
  const modelMissing =
    response.status === 404 ||
    /not found|not supported|does not exist/i.test(body);

  if (modelMissing) {
    return {
      error: "Model AI không khả dụng, hãy đổi GEMINI_MODEL trong .env.",
    };
  }

  return { error: `AI trả lỗi (HTTP ${response.status}). Hãy thử lại sau.` };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function extractText(payload: unknown): string | null {
  if (!isRecord(payload)) return null;

  const candidates = payload.candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) return null;

  const candidate = candidates[0];
  if (!isRecord(candidate)) return null;

  const content = candidate.content;
  if (!isRecord(content)) return null;

  const parts = content.parts;
  if (!Array.isArray(parts) || parts.length === 0) return null;

  const part = parts[0];
  if (!isRecord(part) || typeof part.text !== "string") return null;

  return part.text;
}

function parseCard(text: string): GeneratedCard | null {
  let data: unknown;
  try {
    data = JSON.parse(stripCodeFence(text));
  } catch {
    return null;
  }

  if (!isRecord(data)) return null;

  const { reading, meaningVi, example, exampleVi } = data;
  if (
    typeof reading !== "string" ||
    typeof meaningVi !== "string" ||
    typeof example !== "string" ||
    typeof exampleVi !== "string"
  ) {
    return null;
  }

  const card = {
    reading: reading.trim(),
    meaningVi: meaningVi.trim(),
    example: example.trim(),
    exampleVi: exampleVi.trim(),
  };

  if (!card.meaningVi || !card.example || !card.exampleVi) return null;
  return card;
}

function normalizeReading(
  card: GeneratedCard,
  word: string,
): GeneratedCard | null {
  if (!/[\u4E00-\u9FFF々]/.test(word)) return { ...card, reading: "" };
  return card.reading ? card : null;
}

function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return match ? match[1].trim() : trimmed;
}
