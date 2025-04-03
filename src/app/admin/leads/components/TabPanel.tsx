import React from 'react';
import { Box } from '@mui/material';
import { TabPanelProps } from '../types';

export default function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`leads-tabpanel-${index}`}
      aria-labelledby={`leads-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export function a11yProps(index: number) {
  return {
    id: `leads-tab-${index}`,
    'aria-controls': `leads-tabpanel-${index}`,
  };
}
