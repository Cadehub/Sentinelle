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

// React component to render contacts with buttons
import React from 'react';
import { Phone, Mail, Link as LinkIcon } from 'lucide-react';
import { cn } from './utils';

interface ContactRenderProps {
  text: string;
  className?: string;
}

export const ContactRenderer: React.FC<ContactRenderProps> = ({ text, className = '' }) => {
  const elements = parseContacts(text);

  return (
    <span className={className}>
      {elements.map((elem, idx) => {
        switch (elem.type) {
          case 'phone':
            return (
              <a
                key={idx}
                href={`tel:${elem.value}`}
                className="inline-flex items-center gap-1 px-2 py-1 mx-1 bg-blue-500/10 text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-500/20 transition-colors active:scale-95 whitespace-nowrap"
                title="Appeler"
              >
                <Phone size={14} />
                <span className="text-sm font-medium">{elem.display}</span>
              </a>
            );
          case 'email':
            return (
              <a
                key={idx}
                href={`mailto:${elem.value}`}
                className="inline-flex items-center gap-1 px-2 py-1 mx-1 bg-green-500/10 text-green-600 border border-green-300 rounded-lg hover:bg-green-500/20 transition-colors active:scale-95 whitespace-nowrap"
                title="Envoyer un email"
              >
                <Mail size={14} />
                <span className="text-sm font-medium">{elem.display}</span>
              </a>
            );
          case 'url':
            return (
              <a
                key={idx}
                href={elem.value.startsWith('http') ? elem.value : `https://${elem.value}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-1 mx-1 bg-purple-500/10 text-purple-600 border border-purple-300 rounded-lg hover:bg-purple-500/20 transition-colors active:scale-95 whitespace-nowrap"
                title="Ouvrir le lien"
              >
                <LinkIcon size={14} />
                <span className="text-sm font-medium truncate max-w-xs">{elem.display}</span>
              </a>
            );
          default:
            return <span key={idx}>{elem.value}</span>;
        }
      })}
    </span>
  );
};
