
import { Quiz, QuizQuestion } from "./types";

/**
 * Bộ bóc tách văn bản nâng cao:
 * 1. Nhận diện tiêu đề (dòng ngắn) để tách bài tập mới.
 * 2. Tách Cloze Test khi phát hiện reset số thứ tự (ví dụ: 8 quay về 1).
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

    if ((num <= lastKeyNum && (num === 0 || num === 1)) || (lastKeyNum === -1 && num > 20)) {
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

  // 2. Chia văn bản thành các khối (blocks) dựa trên dòng tiêu đề hoặc reset số
  const rawLines = text.split('\n');
  let currentTitle = customTitle || "";
  let currentExerciseCounter = 0;
  let mcQuestionTotalCounter = 0;

  // Gom các dòng lại thành các phần (sections) dựa trên tiêu đề (dòng ngắn)
  const sections: { title: string; content: string }[] = [];
  let tempContent: string[] = [];
  let tempTitle = currentTitle;

  rawLines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;

    // Nếu dòng cực ngắn (1-3 từ), coi là tiêu đề và cắt section mới
    const wordCount = trimmed.split(/\s+/).length;
    if (wordCount > 0 && wordCount <= 3 && !/^\d+[.)\s]/.test(trimmed)) {
      if (tempContent.length > 0) {
        sections.push({ title: tempTitle || "Bài tập", content: tempContent.join('\n') });
        tempContent = [];
      }
      tempTitle = trimmed;
    } else {
      tempContent.push(line);
    }
  });
  if (tempContent.length > 0) {
    sections.push({ title: tempTitle || "Bài tập", content: tempContent.join('\n') });
  }

  // 3. Xử lý từng section để bóc tách câu hỏi
  sections.forEach(section => {
    const block = section.content;
    const clozePattern = /\((\d+)\)\s*([._]{2,}|\[.*?\]|[A-Z]{2,})/g;
    const allClozeMatches = Array.from(block.matchAll(clozePattern));

    if (allClozeMatches.length > 0) {
      // Xử lý Cloze Test trong section (có thể có nhiều bài nếu số reset)
      let currentBlanks: { index: number; correctAnswer: string; matchText: string }[] = [];
      let lastClozeIdx = -1;
      let startMatchIdx = 0;

      for (let i = 0; i <= allClozeMatches.length; i++) {
        const m = allClozeMatches[i];
        const num = m ? parseInt(m[1]) : -1;

        // Reset số hoặc kết thúc matches -> Tạo câu hỏi Cloze
        if (num <= lastClozeIdx || i === allClozeMatches.length) {
          if (currentBlanks.length > 0) {
            const firstMatch = allClozeMatches[startMatchIdx];
            const searchStart = startMatchIdx === 0 ? 0 : allClozeMatches[startMatchIdx - 1].index + allClozeMatches[startMatchIdx - 1][0].length;
            const searchEnd = i === allClozeMatches.length ? block.length : m.index;
            
            let passage = block.substring(searchStart, searchEnd).trim();
            currentBlanks.forEach(b => {
              passage = passage.replace(b.matchText, `[[BLANK_${b.index}]]`);
            });

            questions.push({
              type: 'cloze',
              question: passage,
              blanks: currentBlanks.map(b => ({ index: b.index, correctAnswer: b.correctAnswer })),
              explanation: `${section.title}`,
              isAnswerGuessed: currentBlanks.some(b => !b.correctAnswer)
            });
            currentExerciseCounter++;
          }
          currentBlanks = [];
          startMatchIdx = i;
        }

        if (m) {
          const currentSet = answerKeySets[currentExerciseCounter] || {};
          currentBlanks.push({
            index: num,
            correctAnswer: currentSet[num] || "",
            matchText: m[0]
          });
          lastClozeIdx = num;
        }
      }
    } else {
      // Xử lý trắc nghiệm thường trong section
      const lines = block.split('\n');
      const optionPattern = /^[a-dA-D][.)]\s/;
      
      let i = 0;
      while (i < lines.length) {
        const line = lines[i].trim();
        if (line && !optionPattern.test(line)) {
          // Tìm xem các dòng tiếp theo có phải options không
          const options: string[] = [];
          let correctAnswer = "";
          let j = i + 1;
          
          while (j < lines.length && (optionPattern.test(lines[j].trim()) || !lines[j].trim())) {
            const optLine = lines[j].trim();
            if (optLine) {
              const isMarked = optLine.includes('*');
              const cleanOpt = optLine.replace('*', '').replace(/^[a-zA-Z0-9][.)]\s*/, '').trim();
              if (cleanOpt) {
                options.push(cleanOpt);
                if (isMarked) correctAnswer = cleanOpt;
              }
            }
            j++;
          }

          if (options.length >= 2) {
            mcQuestionTotalCounter++;
            if (!correctAnswer) {
              const keySet = answerKeySets[0] || {};
              const keyVal = keySet[mcQuestionTotalCounter];
              if (keyVal && keyVal.length === 1) {
                const idx = keyVal.toLowerCase().charCodeAt(0) - 97;
                if (options[idx]) correctAnswer = options[idx];
              }
            }

            questions.push({
              type: 'multiple-choice',
              question: line.replace(/^\d+[.)]\s*/, ''),
              options,
              correctAnswer: correctAnswer || options[0],
              explanation: section.title,
              isAnswerGuessed: !correctAnswer
            });
            i = j - 1;
          }
        }
        i++;
      }
    }
  });

  return {
    quizTitle: customTitle || (sections[0]?.title) || "Bài tập SmartAssess",
    questions
  };
}
