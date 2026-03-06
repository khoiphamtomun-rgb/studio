
import { Quiz, QuizQuestion } from "./types";

/**
 * Bộ bóc tách văn bản nâng cao:
 * 1. Hỗ trợ tách nhiều bài Cloze Test khi phát hiện reset số thứ tự (ví dụ: 8 quay về 1).
 * 2. Nhận diện tiêu đề (dòng ngắn/đơn chữ) để sang bài mới.
 * 3. Đồng bộ bảng đáp án theo thứ tự xuất hiện của các cụm bài tập.
 */
export function parseFixedFormat(text: string, customTitle?: string): Omit<Quiz, 'id' | 'createdAt'> {
  const questions: QuizQuestion[] = [];
  
  // 1. Phân loại các bộ đáp án (Answer Keys) dựa trên reset số về 1
  const answerKeySets: Record<number, string>[] = [];
  let currentKeyMap: Record<number, string> = {};
  let lastKeyNum = -1;

  // Regex tìm đáp án: 1. word, 1-word, (1) word...
  const answerKeyRegex = /(?:^|[\s,;])(\d+)\s*[-.)\s:]\s*([a-zA-Z0-9/]{1,30})(?![a-zA-Z0-9])/g;
  let keyMatch;
  while ((keyMatch = answerKeyRegex.exec(text)) !== null) {
    const num = parseInt(keyMatch[1]);
    const val = keyMatch[2].toLowerCase();

    // Phát hiện reset số trong bảng đáp án (ví dụ: đang 8 về 1)
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

  // 2. Chia văn bản thành các khối (blocks)
  const rawBlocks = text.split(/\n\s*\n/).filter(b => b.trim().length > 0);
  let clozeExerciseCounter = 0;
  let mcQuestionCounter = 0;
  let currentTitle = customTitle || "Bài tập SmartAssess";

  for (let block of rawBlocks) {
    block = block.trim();

    // KIỂM TRA TIÊU ĐỀ: Nếu block chỉ có 1-3 từ (ngắn), coi là tiêu đề cho các bài sau
    const lines = block.split('\n');
    if (lines.length === 1 && block.split(/\s+/).length <= 3) {
      currentTitle = block;
      continue;
    }

    // KIỂM TRA ĐỊNH DẠNG CLOZE TEST
    const clozePattern = /\((\d+)\)\s*([._]{2,}|\[.*?\]|[A-Z]{2,})/g;
    const allMatches = Array.from(block.matchAll(clozePattern));

    if (allMatches.length > 0) {
      let currentBlanks: { index: number; correctAnswer: string; matchText: string }[] = [];
      let lastClozeIdx = -1;
      let startMatchIdx = 0;

      for (let i = 0; i <= allMatches.length; i++) {
        const m = allMatches[i];
        const num = m ? parseInt(m[1]) : -1;

        // Reset hoặc hết matches -> Tách thành bài mới
        if (num <= lastClozeIdx || i === allMatches.length) {
          if (currentBlanks.length > 0) {
            const firstMatch = allMatches[startMatchIdx];
            const searchStart = startMatchIdx === 0 ? 0 : allMatches[startMatchIdx - 1].index + allMatches[startMatchIdx - 1][0].length;
            const searchEnd = i === allMatches.length ? block.length : m.index;
            
            let passage = block.substring(searchStart, searchEnd).trim();
            
            currentBlanks.forEach(b => {
              passage = passage.replace(b.matchText, `[[BLANK_${b.index}]]`);
            });

            questions.push({
              type: 'cloze',
              question: passage,
              blanks: currentBlanks.map(b => ({ index: b.index, correctAnswer: b.correctAnswer })),
              explanation: `${currentTitle} - Phần ${clozeExerciseCounter + 1}`,
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
      continue;
    }

    // KIỂM TRA ĐỊNH DẠNG MULTIPLE CHOICE (Hội thoại hoặc Trắc nghiệm thường)
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
            // Dùng bộ đáp án đầu tiên cho trắc nghiệm
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
    quizTitle: customTitle || currentTitle || "Bài tập SmartAssess",
    questions
  };
}
