/**
 * Simulates Android currentInputConnection.commitText with smart spacing and capitalization
 */
export function applySmartCommit(
  currentText: string,
  cursorPosition: number,
  newText: string
): { updatedText: string; newCursorPosition: number } {
  if (!newText) {
    return { updatedText: currentText, newCursorPosition: cursorPosition };
  }

  const beforeCursor = currentText.slice(0, cursorPosition);
  const afterCursor = currentText.slice(cursorPosition);

  let formatted = '';

  // 1. Smart leading space check
  const lastChar = beforeCursor.length > 0 ? beforeCursor[beforeCursor.length - 1] : '';
  const isLastCharWhitespace = /\s/.test(lastChar);
  const firstCharOfNew = newText.charAt(0);
  const isPunctuation = /[.,!?:;)\]}]/.test(firstCharOfNew);

  if (beforeCursor.length > 0 && !isLastCharWhitespace && !isPunctuation && firstCharOfNew !== ' ') {
    formatted += ' ';
  }

  // 2. Smart sentence capitalization check
  const trimmedBefore = beforeCursor.trimEnd();
  const shouldCapitalize =
    beforeCursor.length === 0 ||
    trimmedBefore.endsWith('.') ||
    trimmedBefore.endsWith('!') ||
    trimmedBefore.endsWith('?') ||
    beforeCursor.endsWith('\n');

  if (shouldCapitalize) {
    formatted += newText.charAt(0).toUpperCase() + newText.slice(1);
  } else {
    formatted += newText;
  }

  const updatedText = beforeCursor + formatted + afterCursor;
  const newCursorPosition = cursorPosition + formatted.length;

  return { updatedText, newCursorPosition };
}
