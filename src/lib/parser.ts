
import { Quiz, QuizQuestion } from "./types";

/**
 * Bộ bóc tách văn bản nâng cao:
 * 1. Hỗ trợ tách nhiều bài Cloze Test khi phát hiện reset số thứ tự (ví dụ: 8 quay về 1).
 * 2. Đồng bộ bảng đáp án theo thứ tự xuất hiện của các cụm bài tập.
 */
export function parseFixedFormat(text: string, customTitle?: string): Omit<Quiz, 'id' | 'createdAt'> {
  const questions: QuizQuestion[] = [];
  
  // 1. Phân loại các bộ đáp án (Answer Keys)
  const answerKeySets: Record<number, string>[] = [];
  let currentKeyMap: Record<number, string> = {};
  let lastKeyNum = -1;

  // Regex tìm đáp án: 1. word, 1-word, (1) word...
  const answerKeyRegex = /(?:^|[\s,;])(\d+)\s*[-.)\s:]\s*([a-zA-Z0-9/]{1,30})(?![a-zA-Z0-9])/g;
  let keyMatch;
  while ((keyMatch = answerKeyRegex.exec(text)) !== null) {
    const num = parseInt(keyMatch[1]);
    const val = keyMatch[2].toLowerCase();

    // Phát hiện reset số trong bảng đáp án
    if (num <= lastKeyNum && (num === 0 || num === 1)) {
      if (Object.keys(currentKeyMap).length > 0) {
        answerKeySets.push(currentKeyMap);
      }
      currentKeyMap = {};
    }

    currentKeyMap[num] = val;
    lastKeyNum = num;
  }
  if (Object.keys(currentKeyMap).length > 0) {
    answerKeySets.push(currentKeyMap);
  }

  // 2. Chia khối văn bản và xử lý từng bài tập
  const blocks = text.split(/\n\s*\n/).filter(b => b.trim().length > 0);
  let clozeExerciseCounter = 0;
  let mcQuestionCounter = 0;

  for (let block of blocks) {
    block = block.trim();

    // KIỂM TRA ĐỊNH DẠNG CLOZE TEST
    const clozePattern = /\((\d+)\)\s*([._]{2,}|\[.*?\]|[A-Z]{2,})/g;
    const allMatches = Array.from(block.matchAll(clozePattern));

    if (allMatches.length > 0) {
      // Logic mới: Tách bài tập ngay trong block nếu số thứ tự reset
      let currentBlanks: { index: number; correctAnswer: string; matchText: string }[] = [];
      let lastClozeIdx = -1;
      let startMatchIdx = 0;

      for (let i = 0; i <= allMatches.length; i++) {
        const m = allMatches[i];
        const num = m ? parseInt(m[1]) : -1;

        // Nếu gặp reset hoặc hết các match trong block này
        if (num <= lastClozeIdx || i === allMatches.length) {
          if (currentBlanks.length > 0) {
            // Xác định đoạn văn bản cho bài tập này
            const firstMatch = allMatches[startMatchIdx];
            const lastMatch = allMatches[i - 1];
            
            // Tìm ranh giới của bài tập (từ đầu block hoặc từ sau bài trước đến hết bài này)
            const searchStart = startMatchIdx === 0 ? 0 : allMatches[startMatchIdx - 1].index + allMatches[startMatchIdx - 1][0].length;
            const searchEnd = i === allMatches.length ? block.length : m.index;
            
            let passage = block.substring(searchStart, searchEnd).trim();
            
            // Thay thế placeholders
            currentBlanks.forEach(b => {
              passage = passage.replace(b.matchText, `[[BLANK_${b.index}]]`);
            });

            questions.push({
              type: 'cloze',
              question: passage,
              blanks: currentBlanks.map(b => ({ index: b.index, correctAnswer: b.correctAnswer })),
              explanation: `Bài tập điền từ số ${clozeExerciseCounter + 1}`,
              isAnswerGuessed: currentBlanks.some(b => !b.correctAnswer)
            });

            clozeExerciseCounter++;
          }
          currentBlanks = [];
          startMatchIdx = i;
        }

        if (m) {
          const currentSet = answerKeySets[clozeExerciseCounter] || {};
          currentBlanks.push({
            index: num,
            correctAnswer: currentSet[num] || "",
            matchText: m[0]
          });
          lastClozeIdx = num;
        }
      }
      if (allMatches.length > 0) continue; // Đã xử lý xong cụm Cloze trong block này
    }

    // KIỂM TRA ĐỊNH DẠNG MULTIPLE CHOICE
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
            // Dùng bộ đáp án đầu tiên cho trắc nghiệm nếu không reset
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
            explanation: "Trắc nghiệm bóc tách.",
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
