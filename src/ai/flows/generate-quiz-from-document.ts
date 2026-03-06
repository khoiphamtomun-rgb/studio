'use server';
/**
 * @fileOverview A Genkit flow for generating quizzes from document content.
 *
 * - generateQuizFromDocument - A function that handles the quiz generation process.
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
  quizTitle: z.string().describe('A suitable title for the quiz based on the document.'),
  questions: z.array(
    z.discriminatedUnion('type', [
      z.object({
        type: z.literal('multiple-choice'),
        question: z.string().describe('The multiple-choice question.'),
        options: z.array(z.string()).min(4).describe('Array of at least 4 possible answers.'),
        correctAnswer: z.string().describe('The correct answer from the options.'),
        explanation: z.string().describe('Explanation for the correct answer.'),
      }),
      z.object({
        type: z.literal('true-false'),
        question: z.string().describe('The true/false question.'),
        correctAnswer: z.boolean().describe('The correct answer (true or false).'),
        explanation: z.string().describe('Explanation for the correct answer.'),
      }),
      z.object({
        type: z.literal('short-answer'),
        question: z.string().describe('The short-answer question.'),
        correctAnswer: z.string().describe('The expected correct short answer.'),
        explanation: z.string().describe('Explanation for the correct answer.'),
      }),
    ])
  ).describe('An array of generated quiz questions.')
});
export type GenerateQuizFromDocumentOutput = z.infer<typeof GenerateQuizFromDocumentOutputSchema>;

// Define the prompt
const generateQuizPrompt = ai.definePrompt({
  name: 'generateQuizPrompt',
  input: {schema: GenerateQuizFromDocumentInputSchema},
  output: {schema: GenerateQuizFromDocumentOutputSchema},
  prompt: `You are an AI assistant specialized in creating educational quizzes.\nYour task is to analyze the provided document content and generate a comprehensive quiz.\nThe quiz should consist of a mix of multiple-choice, true/false, and short-answer questions.\nFor each question, provide a clear question, the correct answer, and an in-depth explanation.\nFor multiple-choice questions, provide at least 4 options, only one of which is correct.\nFor true/false questions, the correct answer should be a boolean (true or false).\nFor short-answer questions, provide a concise but accurate correct answer.\n\nGenerate the output in JSON format, strictly following the provided schema.\n\nDocument Content:\n{{{documentContent}}}`, 
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
      throw new Error('Failed to generate quiz from document.');
    }
    return output;
  }
);

// Export wrapper function
export async function generateQuizFromDocument(input: GenerateQuizFromDocumentInput): Promise<GenerateQuizFromDocumentOutput> {
  return generateQuizFromDocumentFlow(input);
}
