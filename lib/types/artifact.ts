/**
 * Artifact types for code and content previews
 * Based on Anthropic Claude Artifacts pattern
 */

export type ArtifactType = 'html' | 'react' | 'svg' | 'mermaid' | 'markdown' | 'code';

export interface Artifact {
  id: string;
  type: ArtifactType;
  title?: string;
  language: string;
  code: string;
  // Whether this artifact should be displayed in a preview
  previewable: boolean;
}

/**
 * Detect if code should be treated as a previewable artifact
 */
export function detectArtifact(language: string, code: string): Artifact | null {
  const trimmedCode = code.trim();

  // HTML artifacts: complete HTML documents
  if (language === 'html') {
    const hasDoctype = /<!DOCTYPE/i.test(trimmedCode);
    const hasHtmlTag = /<html[>\s]/i.test(trimmedCode);
    const hasHeadOrBody = /<(head|body)[>\s]/i.test(trimmedCode);

    // Must be a complete HTML document to be previewable
    if ((hasDoctype || hasHtmlTag) && hasHeadOrBody && trimmedCode.length > 100) {
      return {
        id: generateArtifactId(),
        type: 'html',
        language: 'html',
        code: trimmedCode,
        previewable: true,
      };
    }
  }

  // SVG artifacts: standalone SVG elements
  if (language === 'svg' || (language === 'html' && trimmedCode.startsWith('<svg'))) {
    if (/<svg[\s>]/i.test(trimmedCode) && trimmedCode.length > 50) {
      return {
        id: generateArtifactId(),
        type: 'svg',
        language: 'svg',
        code: trimmedCode,
        previewable: true,
      };
    }
  }

  // Markdown artifacts: markdown content
  if (language === 'markdown' || language === 'md') {
    if (trimmedCode.length > 20) {
      return {
        id: generateArtifactId(),
        type: 'markdown',
        language: 'markdown',
        code: trimmedCode,
        previewable: true,
      };
    }
  }

  return null;
}

/**
 * Generate unique artifact ID
 */
function generateArtifactId(): string {
  return `artifact-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Extract code blocks from markdown text with artifact detection
 */
export function extractArtifactsFromMarkdown(text: string): {
  artifacts: Artifact[];
  cleanedText: string;
} {
  const artifacts: Artifact[] = [];
  let cleanedText = text;

  // Method 1: Extract from markdown code blocks
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    const language = match[1] || 'text';
    const code = match[2];

    const artifact = detectArtifact(language, code);

    if (artifact) {
      artifacts.push(artifact);
      // Remove the entire code block from text
      cleanedText = cleanedText.replace(match[0], '');
    }
  }

  // Method 2: Extract standalone HTML documents (not in code blocks)
  // Matches HTML that starts with <!DOCTYPE or <html and ends with </html>
  const htmlDocRegex = /(?:<!DOCTYPE[^>]*>\s*)?<html[\s\S]*?<\/html>/gi;
  const htmlMatches = text.match(htmlDocRegex);

  if (htmlMatches) {
    for (const htmlCode of htmlMatches) {
      // Check if this HTML is still in the cleaned text (not already removed by code block processing)
      if (cleanedText.includes(htmlCode)) {
        const artifact = detectArtifact('html', htmlCode);
        if (artifact) {
          artifacts.push(artifact);
          // Remove HTML from text
          cleanedText = cleanedText.replace(htmlCode, '');
        }
      }
    }
  }

  // Method 3: Extract standalone SVG elements
  const svgRegex = /<svg[\s\S]*?<\/svg>/gi;
  const svgMatches = text.match(svgRegex);

  if (svgMatches) {
    for (const svgCode of svgMatches) {
      // Check if this SVG is still in the cleaned text
      if (cleanedText.includes(svgCode)) {
        const artifact = detectArtifact('svg', svgCode);
        if (artifact) {
          artifacts.push(artifact);
          // Remove SVG from text
          cleanedText = cleanedText.replace(svgCode, '');
        }
      }
    }
  }

  // Clean up excessive whitespace
  cleanedText = cleanedText.replace(/\n{3,}/g, '\n\n').trim();

  return { artifacts, cleanedText };
}

