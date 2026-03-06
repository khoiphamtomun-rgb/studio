
import { Quiz, QuizQuestion } from "./types";

/**
 * Bộ bóc tách văn bản nâng cao:
 * 1. Hỗ trợ nhiều bài Cloze Test trong một tài liệu (tự động tách khi reset số).
 * 2. Đồng bộ bảng đáp án theo thứ tự xuất hiện của các bài tập.
 */
export function parseFixedFormat(text: string, customTitle?: string): Omit<Quiz, 'id' | 'createdAt'> {
  const questions: QuizQuestion[] = [];
  
  // 1. Tìm và phân loại các bộ đáp án (Answer Keys)
  // Mỗi lần gặp số 1 (hoặc 0) sau một chuỗi số lớn hơn, ta coi là bắt đầu bộ đáp án cho bài tiếp theo.
  const answerKeySets: Record<number, string>[] = [];
  let currentKeyMap: Record<number, string> = {};
  let lastNum = -1;

  // Regex tìm đáp án: 1. word, 1-word, (1) word...
  const answerKeyRegex = /(?:^|[\s,;])(\d+)\s*[-.)\s:]\s*([a-zA-Z0-9/]{1,30})(?![a-zA-Z0-9])/g;
  let keyMatch;
  while ((keyMatch = answerKeyRegex.exec(text)) !== null) {
    const num = parseInt(keyMatch[1]);
    const val = keyMatch[2].toLowerCase();

    // Phát hiện reset số (ví dụ đang ở 8 lại gặp 1)
    if (num <= lastNum && (num === 0 || num === 1)) {
      if (Object.keys(currentKeyMap).length > 0) {
        answerKeySets.push(currentKeyMap);
      }
      currentKeyMap = {};
    }

    currentKeyMap[num] = val;
    lastNum = num;
  }
  if (Object.keys(currentKeyMap).length > 0) {
    answerKeySets.push(currentKeyMap);
  }

  // 2. Chia khối văn bản theo đoạn và xử lý từng bài tập
  const blocks = text.split(/\n\s*\n/).filter(b => b.trim().length > 0);
  let clozeExerciseCounter = 0;
  let mcQuestionCounter = 0;

  for (let block of blocks) {
    block = block.trim();

    // KIỂM TRA ĐỊNH DẠNG CLOZE TEST
    const clozePattern = /\((\d+)\)\s*([._]{3,}|\[.*?\]|[A-Z]{2,})/g;
    const clozeMatches = Array.from(block.matchAll(clozePattern));

    if (clozeMatches.length >= 2) {
      const blanks: { index: number; correctAnswer: string }[] = [];
      let processedPassage = block;

      // Lấy bộ đáp án tương ứng với thứ tự bài Cloze này
      const currentSet = answerKeySets[clozeExerciseCounter] || {};

      clozeMatches.forEach((m) => {
        const index = parseInt(m[1]);
        const alreadyFilled = m[2].match(/^[A-Z]{2,}$/) ? m[2] : null;
        
        if (alreadyFilled && index === 0) return;

        const keyAnswer = currentSet[index] || "";
        blanks.push({
          index,
          correctAnswer: keyAnswer
        });

        processedPassage = processedPassage.replace(m[0], `[[BLANK_${index}]]`);
      });

      if (blanks.length > 0) {
        questions.push({
          type: 'cloze',
          question: processedPassage,
          blanks: blanks.sort((a, b) => a.index - b.index),
          explanation: `Bài tập điền từ số ${clozeExerciseCounter + 1}`,
          isAnswerGuessed: blanks.some(b => !b.correctAnswer)
        });
        clozeExerciseCounter++;
        continue;
      }
    }

    // KIỂM TRA ĐỊNH DẠNG MULTIPLE CHOICE (Hỗ trợ nhiều kiểu format)
    // Kiểu 1: Đối thoại + Câu hỏi + Đáp án (Man: ... Woman: ... What...? a. b. c.)
    const dialogueMCRegex = /([\s\S]+?)\s*([a-zA-Z\s,']+\?)\s*\n*([a-dA-D][.)]\s[\s\S]+)/;
    const dialogueMatch = block.match(dialogueMCRegex);
    if (dialogueMatch) {
      const dialogue = dialogueMatch[1].trim();
      const subQuestion = dialogueMatch[2].trim();
      const optionsPart = dialogueMatch[3].trim();
      
      const optionsRaw = optionsPart.split(/\n|(?=[a-dA-D][.)]\s)/).map(o => o.trim()).filter(o => o);
      const options: string[] = [];
      let correctAnswer = "";

      optionsRaw.forEach(opt => {
        let clean = opt.replace(/^[a-dA-D][.)]\s*/, "").trim();
        if (clean) {
          options.push(clean);
          if (opt.startsWith('*')) correctAnswer = clean;
        }
      });

      if (options.length >= 2) {
        mcQuestionCounter++;
        if (!correctAnswer) {
          // Thử tìm trong bộ đáp án đầu tiên (Trắc nghiệm thường dùng chung bộ hoặc bộ riêng)
          const keyLetter = (answerKeySets[0] || {})[mcQuestionCounter];
          if (keyLetter && keyLetter.length === 1) {
            const idx = keyLetter.charCodeAt(0) - 97;
            if (options[idx]) correctAnswer = options[idx];
          }
        }
        questions.push({
          type: 'multiple-choice',
          question: `${dialogue}\n\n${subQuestion}`,
          options,
          correctAnswer: correctAnswer || options[0],
          explanation: "Trắc nghiệm bóc tách từ đối thoại.",
          isAnswerGuessed: !correctAnswer
        });
        continue;
      }
    }

    // Kiểu 2: Truyền thống (Câu hỏi dòng 1, Đáp án dòng sau)
    const lines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length >= 2) {
      const optionStartIndex = lines.findIndex(l => /^[a-dA-D][.)]\s/.test(l));
      if (optionStartIndex !== -1) {
        const rawQuestionText = lines.slice(0, optionStartIndex).join(' ');
        const optionsRaw = lines.slice(optionStartIndex);
        const options: string[] = [];
        let correctAnswer = "";

        optionsRaw.forEach(line => {
          let cleanLine = line.trim();
          const isMarked = cleanLine.includes('*');
          if (isMarked) cleanLine = cleanLine.replace('*', '').trim();
          const optText = cleanLine.replace(/^[a-zA-Z0-9][.)]\s*/, '').trim();
          if (optText) {
            options.push(optText);
            if (isMarked) correctAnswer = optText;
          }
        });

        if (options.length >= 2) {
          mcQuestionCounter++;
          if (!correctAnswer) {
            const keyLetter = (answerKeySets[0] || {})[mcQuestionCounter];
            if (keyLetter && keyLetter.length === 1) {
              const idx = keyLetter.charCodeAt(0) - 97;
              if (options[idx]) correctAnswer = options[idx];
            }
          }
          questions.push({
            type: 'multiple-choice',
            question: rawQuestionText.replace(/^\d+[.)]\s*/, ''),
            options,
            correctAnswer: correctAnswer || options[0],
            explanation: "Trắc nghiệm bóc tách truyền thống.",
            isAnswerGuessed: !correctAnswer
          });
        }
      }
    }
  }

  return {
    quizTitle: customTitle || "Bài tập SmartAssess",
    questions
  };
}
