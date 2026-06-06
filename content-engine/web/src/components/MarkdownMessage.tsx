'use client';

import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Box, Link, Typography } from '@mui/material';

/**
 * Renders assistant chat content as rich markdown (headings, bullets, tables,
 * code, links) styled with MUI — fixes the "plain text" rendering bug. Used by
 * both the ICP and Team chat threads.
 */
function MarkdownMessageBase({ text }: { text: string }) {
  return (
    <Box
      sx={{
        fontSize: 14,
        lineHeight: 1.6,
        wordBreak: 'break-word',
        '& > :first-of-type': { mt: 0 },
        '& > :last-child': { mb: 0 },
        '& p': { my: 0.75 },
        '& ul, & ol': { my: 0.75, pl: 2.5 },
        '& li': { my: 0.25 },
        '& li > p': { my: 0 },
        '& h1': { fontSize: 19, fontWeight: 800, mt: 1.5, mb: 0.75 },
        '& h2': { fontSize: 17, fontWeight: 800, mt: 1.5, mb: 0.5 },
        '& h3': { fontSize: 15, fontWeight: 700, mt: 1.25, mb: 0.5 },
        '& h4, & h5, & h6': { fontSize: 14, fontWeight: 700, mt: 1, mb: 0.25 },
        '& strong': { fontWeight: 700 },
        '& a': { color: 'primary.main', fontWeight: 600 },
        '& code': {
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: 12.5,
          bgcolor: 'rgba(124,58,237,0.10)',
          px: 0.5,
          py: 0.15,
          borderRadius: 0.75,
        },
        '& pre': {
          bgcolor: 'rgba(15,23,42,0.92)',
          color: '#E2E8F0',
          p: 1.5,
          borderRadius: 1.5,
          overflowX: 'auto',
          my: 1,
        },
        '& pre code': { bgcolor: 'transparent', color: 'inherit', p: 0, fontSize: 12.5 },
        '& blockquote': {
          borderLeft: '3px solid',
          borderColor: 'divider',
          pl: 1.5,
          ml: 0,
          my: 1,
          color: 'text.secondary',
        },
        '& table': { borderCollapse: 'collapse', my: 1, width: '100%', fontSize: 13 },
        '& th, & td': { border: '1px solid', borderColor: 'divider', px: 1, py: 0.5, textAlign: 'left' },
        '& th': { bgcolor: 'action.hover', fontWeight: 700 },
        '& hr': { border: 0, borderTop: '1px solid', borderColor: 'divider', my: 1.5 },
        '& img': { maxWidth: '100%', borderRadius: 1 },
      }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <Link href={href} target="_blank" rel="noopener noreferrer" underline="hover">
              {children}
            </Link>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </Box>
  );
}

export const MarkdownMessage = memo(MarkdownMessageBase);

/** Three-dot animated "assistant is typing" indicator (ChatGPT/Claude style). */
export function TypingDots({ label }: { label?: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box sx={{ display: 'flex', gap: 0.6, py: 0.5 }}>
        {[0, 1, 2].map((i) => (
          <Box
            key={i}
            sx={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              bgcolor: 'text.secondary',
              opacity: 0.5,
              animation: 'mq-typing 1.2s infinite ease-in-out',
              animationDelay: `${i * 0.18}s`,
              '@keyframes mq-typing': {
                '0%, 60%, 100%': { transform: 'translateY(0)', opacity: 0.35 },
                '30%': { transform: 'translateY(-4px)', opacity: 0.9 },
              },
            }}
          />
        ))}
      </Box>
      {label && (
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
      )}
    </Box>
  );
}
