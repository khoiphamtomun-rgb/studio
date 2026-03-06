'use server';
/**
 * @fileOverview A Genkit flow for extracting quizzes from document content.
 *
 * - generateQuizFromDocument - A function that handles the quiz extraction process.
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

// Define Output Schema
const GenerateQuizFromDocumentOutputSchema = z.object({
  quizTitle: z.string().describe('A suitable title for the quiz extracted from the document.'),
  questions: z.array(
    z.discriminatedUnion('type', [
      z.object({
        type: z.literal('multiple-choice'),
        question: z.string().describe('The multiple-choice question found in the document.'),
        options: z.array(z.string()).min(2).describe('Array of possible answers provided for this question.'),
        correctAnswer: z.string().describe('The correct answer identified in the document.'),
        explanation: z.string().describe('Explanation provided in the document or a brief context why it is correct.'),
      }),
      z.object({
        type: z.literal('true-false'),
        question: z.string().describe('The true/false question found in the document.'),
        correctAnswer: z.boolean().describe('The correct answer (true or false).'),
        explanation: z.string().describe('Explanation provided in the document or a brief context.'),
      }),
      z.object({
        type: z.literal('short-answer'),
        question: z.string().describe('The short-answer or essay question found in the document.'),
        correctAnswer: z.string().describe('The expected correct answer or key points provided.'),
        explanation: z.string().describe('Explanation or context for the answer.'),
      }),
    ])
  ).describe('An array of quiz questions extracted directly from the document.')
});
export type GenerateQuizFromDocumentOutput = z.infer<typeof GenerateQuizFromDocumentOutputSchema>;

// Define the prompt
const generateQuizPrompt = ai.definePrompt({
  name: 'generateQuizPrompt',
  input: {schema: GenerateQuizFromDocumentInputSchema},
  output: {schema: GenerateQuizFromDocumentOutputSchema},
  prompt: `Bạn là một trợ lý AI chuyên về giáo dục. 
Nhiệm vụ của bạn là phân tích nội dung tài liệu được cung cấp và TRÍCH XUẤT các câu hỏi trắc nghiệm hoặc bài tập có sẵn trong đó.

LƯU Ý QUAN TRỌNG:
1. KHÔNG tự tạo câu hỏi mới. Chỉ lấy những câu hỏi thực sự xuất hiện trong văn bản.
2. Xác định đúng loại câu hỏi:
   - 'multiple-choice': Câu hỏi có các phương án lựa chọn (A, B, C, D...).
   - 'true-false': Câu hỏi yêu cầu xác định đúng/sai.
   - 'short-answer': Các câu hỏi tự luận, điền vào chỗ trống hoặc câu hỏi mở.
3. Nếu tài liệu có đáp án đi kèm cho câu hỏi đó, hãy trích xuất nó vào trường 'correctAnswer'. Nếu không có đáp án rõ ràng, hãy dựa vào nội dung tài liệu để xác định đáp án đúng nhất.
4. Trường 'type' PHẢI là chính xác một trong các chuỗi: 'multiple-choice', 'true-false', hoặc 'short-answer'. Tuyệt đối không dùng 'true/false'.

Văn bản tài liệu:
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
    if (!output) {
      throw new Error('Failed to extract quiz from document.');
    }
    return output;
  }
);

// Export wrapper function
export async function generateQuizFromDocument(input: GenerateQuizFromDocumentInput): Promise<GenerateQuizFromDocumentOutput> {
  return generateQuizFromDocumentFlow(input);
}
