'use client';

import React, { useState } from 'react';
import { Box, Typography, Collapse } from '@mui/material';
import { motion } from 'framer-motion';
import AddIcon from '@mui/icons-material/Add';
import Reveal from './Reveal';

interface FaqItem {
  question: string;
  answer: string;
}

const FaqAccordion = ({ items }: { items: FaqItem[] }) => {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <Reveal key={item.question} delay={i * 0.05}>
            <Box
              onClick={() => setOpen(isOpen ? null : i)}
              sx={{
                p: { xs: 2.5, md: 3 },
                borderRadius: 3,
                cursor: 'pointer',
                background: '#ffffff',
                boxShadow: isOpen ? '0 12px 34px rgba(15,23,42,0.08)' : '0 4px 14px rgba(15,23,42,0.05)',
                border: '1px solid',
                borderColor: isOpen ? 'rgba(255,175,6,0.45)' : 'rgba(15,23,42,0.08)',
                transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                <Typography sx={{ fontWeight: 700, fontSize: { xs: '1rem', md: '1.1rem' }, color: '#0f1320' }}>
                  {item.question}
                </Typography>
                <Box
                  component={motion.div}
                  animate={{ rotate: isOpen ? 135 : 0 }}
                  transition={{ duration: 0.3 }}
                  sx={{ color: '#ffaf06', display: 'flex', flexShrink: 0 }}
                >
                  <AddIcon />
                </Box>
              </Box>
              <Collapse in={isOpen}>
                <Typography sx={{ color: '#475569', mt: 2, lineHeight: 1.7 }}>
                  {item.answer}
                </Typography>
              </Collapse>
            </Box>
          </Reveal>
        );
      })}
    </Box>
  );
};

export default FaqAccordion;
