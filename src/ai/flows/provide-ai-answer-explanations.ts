'use server';
/**
 * @fileOverview Provides AI-generated explanations for quiz answers, referencing original document content.
 *
 * - explainAnswer - A function that generates an explanation for a quiz answer.
 * - ExplainAnswerInput - The input type for the explainAnswer function.
 * - ExplainAnswerOutput - The return type for the explainAnswer function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExplainAnswerInputSchema = z.object({
  question: z.string().describe('The quiz question.'),
  userAnswer: z.string().describe('The answer provided by the user.'),
  isCorrect: z.boolean().describe('Whether the user\u0027s answer was correct.'),
  documentContent: z
    .string()
    .optional()
    .describe('Relevant content from the original document to reference.'),
});
export type ExplainAnswerInput = z.infer<typeof ExplainAnswerInputSchema>;

const ExplainAnswerOutputSchema = z.object({
  explanation: z.string().describe('A detailed explanation for the answer.'),
});
export type ExplainAnswerOutput = z.infer<typeof ExplainAnswerOutputSchema>;

export async function explainAnswer(input: ExplainAnswerInput): Promise<ExplainAnswerOutput> {
  return explainAnswerFlow(input);
}

const prompt = ai.definePrompt({
  name: 'explainAnswerPrompt',
  input: {schema: ExplainAnswerInputSchema},
  output: {schema: ExplainAnswerOutputSchema},
  prompt: `You are an expert tutor providing in-depth explanations for quiz answers based on provided document content.

Question: {{{question}}}
User's Answer: {{{userAnswer}}}

{{#if isCorrect}}
The user's answer is correct. Provide a comprehensive explanation supporting why the answer is correct. Elaborate on the topic and offer additional relevant context.
{{else}}
The user's answer is incorrect. Explain clearly why the user's answer is wrong and then provide the correct reasoning and answer.
{{/if}}

{{#if documentContent}}
Reference the following document content in your explanation:
Document Content: {{{documentContent}}}
{{/if}}

Your explanation should be detailed, easy to understand, and educational.
`,
});

const explainAnswerFlow = ai.defineFlow(
  {
    name: 'explainAnswerFlow',
    inputSchema: ExplainAnswerInputSchema,
    outputSchema: ExplainAnswerOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
