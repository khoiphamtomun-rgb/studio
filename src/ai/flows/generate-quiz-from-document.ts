'use server';
/**
 * @fileOverview A Genkit flow for extracting or generating quizzes from document content.
 *
 * - generateQuizFromDocument - A function that handles the quiz extraction/generation process.
 * - GenerateQuizFromDocumentInput - The input type for the generateQuizFromDocument function.
 * - GenerateQuizFromDocumentOutput - The return type for the generateQuizFromDocument function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Define Input Schema
const GenerateQuizFromDocumentInputSchema = z.object({
  documentContent: z.string().describe('The plain text content of the uploaded document.'),
});
export type GenerateQuizFromDocumentInput = z.infer<typeof GenerateQuizFromDocumentInputSchema>;

// Define Question Schemas
const MultipleChoiceSchema = z.object({
  type: z.literal('multiple-choice'),
  question: z.string().describe('The question text.'),
  options: z.array(z.string()).min(2).describe('List of options.'),
  correctAnswer: z.string().describe('The correct option.'),
  explanation: z.string().describe('Why this answer is correct.'),
});

const TrueFalseSchema = z.object({
  type: z.literal('true-false'),
  question: z.string().describe('The true/false question text.'),
  correctAnswer: z.boolean().describe('The correct answer (true or false).'),
  explanation: z.string().describe('Context for the answer.'),
});

const ShortAnswerSchema = z.object({
  type: z.literal('short-answer'),
  question: z.string().describe('The short-answer question text.'),
  correctAnswer: z.string().describe('The expected correct answer.'),
  explanation: z.string().describe('Key points or context.'),
});

// Define Output Schema
const GenerateQuizFromDocumentOutputSchema = z.object({
  quizTitle: z.string().describe('A suitable title for the quiz.'),
  questions: z.array(
    z.discriminatedUnion('type', [
      MultipleChoiceSchema,
      TrueFalseSchema,
      ShortAnswerSchema,
    ])
  ).describe('An array of quiz questions.')
});
export type GenerateQuizFromDocumentOutput = z.infer<typeof GenerateQuizFromDocumentOutputSchema>;

// Define the prompt
const generateQuizPrompt = ai.definePrompt({
  name: 'generateQuizPrompt',
  input: {schema: GenerateQuizFromDocumentInputSchema},
  output: {schema: GenerateQuizFromDocumentOutputSchema},
  prompt: `Bạn là một trợ lý AI giáo dục thông minh. Nhiệm vụ của bạn là tạo ra một bộ câu hỏi kiểm tra chất lượng cao dựa trên tài liệu được cung cấp.

HƯỚNG DẪN CỤ THỂ:
1. ƯU TIÊN TRÍCH XUẤT: Nếu tài liệu có sẵn các câu hỏi hoặc bài tập, hãy trích xuất chúng chính xác.
2. TỰ SOẠN THẢO: Nếu tài liệu là một đoạn văn bản kiến thức và KHÔNG có sẵn câu hỏi, hãy tự soạn 5-10 câu hỏi bao quát các nội dung quan trọng nhất.
3. ĐỊNH DẠNG BẮT BUỘC:
   - 'multiple-choice': Dành cho câu hỏi trắc nghiệm.
   - 'true-false': Dành cho câu hỏi Đúng/Sai. PHẢI dùng chuỗi 'true-false' có dấu gạch nối, KHÔNG dùng 'true/false'.
   - 'short-answer': Dành cho câu hỏi tự luận ngắn hoặc điền khuyết.
4. NGÔN NGỮ: Sử dụng ngôn ngữ của tài liệu nguồn (ưu tiên Tiếng Việt).

Nội dung tài liệu:
{{{documentContent}}}`, 
});

// Define the flow
const generateQuizFromDocumentFlow = ai.defineFlow(
  {
    name: 'generateQuizFromDocumentFlow',
    inputSchema: GenerateQuizFromDocumentInputSchema,
    outputSchema: GenerateQuizFromDocumentOutputSchema,
  },
  async (input) => {
    const {output} = await generateQuizPrompt(input);
    if (!output || output.questions.length === 0) {
      throw new Error('Không thể tạo câu hỏi từ nội dung này. Vui lòng kiểm tra lại định dạng file.');
    }
    return output;
  }
);

// Export wrapper function
export async function generateQuizFromDocument(input: GenerateQuizFromDocumentInput): Promise<GenerateQuizFromDocumentOutput> {
  return generateQuizFromDocumentFlow(input);
}