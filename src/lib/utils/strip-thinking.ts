export function stripThinking(text: string) {
  return text
    .replace(/<(?:think|thinking)>[\s\S]*?<\/(?:think|thinking)>/gi, "")
    .replace(/<\/(?:think|thinking)>/gi, "")
    .replace(/<(?:think|thinking)>/gi, "");
}

// Streaming-aware: suppresses text inside <think> blocks even when unclosed
export function visibleText(raw: string): string {
  let result = "";
  let i = 0;
  while (i < raw.length) {
    const openMatch = raw.slice(i).match(/<(?:think|thinking)>/i);
    if (openMatch && openMatch.index !== undefined) {
      result += raw.slice(i, i + openMatch.index);
      const afterOpen = i + openMatch.index + openMatch[0].length;
      const closeMatch = raw.slice(afterOpen).match(/<\/(?:think|thinking)>/i);
      if (closeMatch && closeMatch.index !== undefined) {
        i = afterOpen + closeMatch.index + closeMatch[0].length;
      } else {
        return result;
      }
    } else {
      result += raw.slice(i);
      break;
    }
  }
  return result;
}
