
import { Quiz, QuizQuestion } from "./types";

/**
 * Bộ bóc tách văn bản nâng cao:
 * 1. Tách biệt phần "Nội dung bài tập" và "Phần đáp án".
 * 2. Nhận diện tiêu đề bài tập để chia nhỏ các câu hỏi.
 * 3. Khớp chính xác bộ đáp án với từng bài tập dựa trên thứ tự xuất hiện.
 */
export function parseFixedFormat(text: string, customTitle?: string): Omit<Quiz, 'id' | 'createdAt'> {
  const questions: QuizQuestion[] = [];
  const lines = text.split('\n');
  
  // 1. Tìm và trích xuất các bộ đáp án (Answer Keys)
  // Một bộ đáp án thường bắt đầu bằng số 1 (hoặc 0) và có nhiều câu liên tiếp
  const answerKeySets: Record<number, string>[] = [];
  let currentKeyMap: Record<number, string> = {};
  let lastKeyNum = -1;

  // Regex tìm đáp án: 1. word, 1-word, (1) word... 
  // Hỗ trợ từ vựng dài và nhiều định dạng
  const answerKeyRegex = /(?:^|[\s,;])(\d+)\s*[-.)\s:]\s*([a-zA-Z0-9/]{1,30})(?![a-zA-Z0-9])/g;
  
  // Quét từ dưới lên để tìm khối đáp án thường nằm ở cuối
  const answerPartMatch = text.match(/(?:Đáp án|Answers|Key):?\s*([\s\S]*)$/i);
  const textToScanForKeys = answerPartMatch ? answerPartMatch[1] : text;

  let keyMatch;
  while ((keyMatch = answerKeyRegex.exec(textToScanForKeys)) !== null) {
    const num = parseInt(keyMatch[1]);
    const val = keyMatch[2].toLowerCase();

    // Nếu số thứ tự reset về 0 hoặc 1, coi là bắt đầu bộ đáp án mới
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

  // 2. Chia văn bản thành các Section dựa trên tiêu đề (dòng ngắn)
  const sections: { title: string; content: string }[] = [];
  let tempContent: string[] = [];
  let tempTitle = customTitle || "";

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;

    // Nhận diện dòng tiêu đề: cực ngắn (1-3 từ) và không bắt đầu bằng số thứ tự
    const wordCount = trimmed.split(/\s+/).length;
    const isHeader = wordCount > 0 && wordCount <= 3 && !/^\d+[.)\s]/.test(trimmed) && !/\(\d+\)/.test(trimmed);

    if (isHeader) {
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

  // 3. Xử lý từng Section để bóc tách Cloze hoặc Trắc nghiệm
  let clozeExerciseIndex = 0;
  let mcGlobalCounter = 0;

  sections.forEach(section => {
    const block = section.content;
    
    // Tìm các ô trống Cloze: (1) ..... hoặc (1) [blank]
    // Lưu ý: Không lấy [A-Z]{2,} làm đáp án trực tiếp để tránh nhận nhầm ví dụ (0) AS
    const clozePattern = /\((\d+)\)\s*([._]{2,}|\[.*?\])/g;
    const allClozeMatches = Array.from(block.matchAll(clozePattern));

    if (allClozeMatches.length > 0) {
      let currentBlanks: { index: number; correctAnswer: string; matchText: string }[] = [];
      let lastNum = -1;
      let startIndex = 0;

      for (let i = 0; i <= allClozeMatches.length; i++) {
        const m = allClozeMatches[i];
        const num = m ? parseInt(m[1]) : -1;

        // Nếu số reset hoặc hết matches -> Tạo câu hỏi Cloze
        if (num <= lastNum || i === allClozeMatches.length) {
          if (currentBlanks.length > 0) {
            const searchStart = startIndex === 0 ? 0 : allClozeMatches[startIndex - 1].index + allClozeMatches[startIndex - 1][0].length;
            const searchEnd = i === allClozeMatches.length ? block.length : m.index;
            
            let passage = block.substring(searchStart, searchEnd).trim();
            currentBlanks.forEach(b => {
              passage = passage.replace(b.matchText, `[[BLANK_${b.index}]]`);
            });

            questions.push({
              type: 'cloze',
              question: passage,
              blanks: currentBlanks.map(b => ({ index: b.index, correctAnswer: b.correctAnswer })),
              explanation: section.title,
            });
            clozeExerciseIndex++;
          }
          currentBlanks = [];
          startIndex = i;
        }

        if (m) {
          const currentSet = answerKeySets[clozeExerciseIndex] || {};
          currentBlanks.push({
            index: num,
            correctAnswer: currentSet[num] || "",
            matchText: m[0]
          });
          lastNum = num;
        }
      }
    } else {
      // Xử lý trắc nghiệm
      const blockLines = block.split('\n');
      const optionPattern = /^[a-dA-D][.)]\s/;
      
      let i = 0;
      while (i < blockLines.length) {
        const line = blockLines[i].trim();
        if (line && !optionPattern.test(line)) {
          const options: string[] = [];
          let correctAnswer = "";
          let j = i + 1;
          
          while (j < blockLines.length && (optionPattern.test(blockLines[j].trim()) || !blockLines[j].trim())) {
            const optLine = blockLines[j].trim();
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
            mcGlobalCounter++;
            if (!correctAnswer) {
              const keySet = answerKeySets[0] || {}; // Trắc nghiệm thường dùng bộ đáp án đầu tiên hoặc duy nhất
              const keyVal = keySet[mcGlobalCounter];
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
              explanation: section.title
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
