// Transform phone numbers, emails, and URLs in text into clickable elements
export interface ContactElement {
  type: 'text' | 'phone' | 'email' | 'url';
  value: string;
  display: string;
}

export function parseContacts(text: string): ContactElement[] {
  if (!text) return [];

  // Regex patterns
  const phonePattern = /(\+?[1-9]\d{1,14}|0[1-9]\d{8,10})/g;
  const emailPattern = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
  const urlPattern = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;

  const elements: (ContactElement & { index: number; length: number })[] = [];
  let match;

  // Find all phone numbers
  while ((match = phonePattern.exec(text)) !== null) {
    elements.push({
      type: 'phone',
      value: match[0],
      display: match[0],
      index: match.index,
      length: match[0].length,
    });
  }

  // Find all emails
  while ((match = emailPattern.exec(text)) !== null) {
    elements.push({
      type: 'email',
      value: match[0],
      display: match[0],
      index: match.index,
      length: match[0].length,
    });
  }

  // Find all URLs
  while ((match = urlPattern.exec(text)) !== null) {
    elements.push({
      type: 'url',
      value: match[0],
      display: match[0],
      index: match.index,
      length: match[0].length,
    });
  }

  // Sort by position and merge with text segments
  elements.sort((a, b) => a.index - b.index);

  const result: ContactElement[] = [];
  let lastIndex = 0;

  for (const elem of elements) {
    if (elem.index > lastIndex) {
      result.push({
        type: 'text',
        value: text.substring(lastIndex, elem.index),
        display: text.substring(lastIndex, elem.index),
      });
    }
    result.push({
      type: elem.type,
      value: elem.value,
      display: elem.display,
    });
    lastIndex = elem.index + elem.length;
  }

  if (lastIndex < text.length) {
    result.push({
      type: 'text',
      value: text.substring(lastIndex),
      display: text.substring(lastIndex),
    });
  }

  return result.length > 0 ? result : [{ type: 'text', value: text, display: text }];
}
