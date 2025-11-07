/**
 * 清理文本中的 ReAct 步骤标记（仅移除标记，保留标记后的实际内容）
 * 只过滤行首的固定步骤标记，不影响标记后面的文本内容
 * 流式输出时不调用此函数，只在保存到数据库时使用
 */
export function cleanReActStepMarkers(text: string): string {
  if (!text) return text;

  const lines = text.split('\n');
  const cleanedLines: string[] = [];

  for (const line of lines) {
    let cleanedLine = line;

    // 移除行首的步骤标记模式（保留标记后的内容）
    cleanedLine = cleanedLine.replace(/^\s*\*\*Step\s+\d+:\s*[A-Z]+(?:\s*\([^)]+\))?\*\*\s*/i, '');
    cleanedLine = cleanedLine.replace(/^\s*Step\s+\d+:\s*[A-Z]+(?:\s*\([^)]+\))?\s*/i, '');
    cleanedLine = cleanedLine.replace(/^\s*\*\*Step\s+\d+:\s*[A-Z]+\*\*\s*/i, '');
    cleanedLine = cleanedLine.replace(/^\s*Step\s+\d+:\s*[A-Z]+\s*/i, '');

    // 匹配单独成行的步骤名称（整行删除）
    if (/^\s*(THINK|ACT|OBSERVE|RESPOND)\s*$/i.test(cleanedLine.trim())) {
      continue;
    }

    // 匹配 **THINK** 等加粗格式（整行删除）
    if (/^\s*\*\*(THINK|ACT|OBSERVE|RESPOND)\*\*\s*$/i.test(cleanedLine.trim())) {
      continue;
    }

    cleanedLine = cleanedLine.replace(/^\s*\*\*Step\s+\d+:\*\*\s*/i, '');
    cleanedLine = cleanedLine.replace(/^\s*Step\s+\d+:\s*/i, '');
    cleanedLine = cleanedLine.replace(/^\s*(Think|Act|Observe|Respond):\s*/i, '');

    // 如果清理后的行不为空，或者原行就是空行，保留它
    if (cleanedLine.trim().length > 0 || line.trim().length === 0) {
      cleanedLines.push(cleanedLine);
    }
  }

  let cleanedText = cleanedLines.join('\n');

  // 清理多余的空行（连续3个或更多换行符变成2个）
  cleanedText = cleanedText.replace(/\n{3,}/g, '\n\n');

  // 清理行首行尾空白
  cleanedText = cleanedText.trim();

  return cleanedText;
}
