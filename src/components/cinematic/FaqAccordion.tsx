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
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid',
                borderColor: isOpen ? 'rgba(255,175,6,0.35)' : 'rgba(255,255,255,0.08)',
                transition: 'border-color 0.3s ease',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                <Typography sx={{ fontWeight: 700, fontSize: { xs: '1rem', md: '1.1rem' }, color: '#fff' }}>
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
                <Typography sx={{ color: 'rgba(255,255,255,0.65)', mt: 2, lineHeight: 1.7 }}>
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
