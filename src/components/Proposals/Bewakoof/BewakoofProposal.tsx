'use client';

import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { 
  Box, 
  Container, 
  Drawer, 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText, 
  Fab, 
  Divider, 
  useTheme, 
  alpha, 
  useMediaQuery,
  LinearProgress,
  Tooltip,
  Paper,
  Typography
} from '@mui/material';
import { 
  KeyboardArrowUp as KeyboardArrowUpIcon,
  Menu as MenuIcon,
  Person as PersonIcon,
  CompareArrows as CompareArrowsIcon,
  TrendingUp as TrendingUpIcon,
  CalendarMonth as CalendarMonthIcon,
  CheckCircle as CheckCircleIcon,
  Home as HomeIcon,
  ArrowForward as ArrowForwardIcon
} from '@mui/icons-material';
// Removed framer-motion import

import HeroSection from './HeroSection';
import ICPSection from './ICPSection';
import CompetitorAnalysisSection from './CompetitorAnalysisSection';
import MarketingStrategySection from './MarketingStrategySection';
import ContentCalendarSection from './ContentCalendarSection';
import ConclusionSection from './ConclusionSection';

// Define section data for navigation
const sections = [
  { id: 'hero', name: 'Introduction', icon: <HomeIcon />, component: HeroSection },
  { id: 'icp', name: 'Ideal Customer Persona', icon: <PersonIcon />, component: ICPSection },
  { id: 'competitors', name: 'Competitor Analysis', icon: <CompareArrowsIcon />, component: CompetitorAnalysisSection },
  { id: 'strategy', name: 'Marketing Strategy', icon: <TrendingUpIcon />, component: MarketingStrategySection },
  { id: 'calendar', name: 'Content Calendar', icon: <CalendarMonthIcon />, component: ContentCalendarSection },
  { id: 'conclusion', name: 'Conclusion', icon: <CheckCircleIcon />, component: ConclusionSection }
];

const BewakoofProposal = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [isMounted, setIsMounted] = useState(false); // Add mounted state
  const [drawerOpen, setDrawerOpen] = useState(false); // Initialize drawer as closed
  const [activeSection, setActiveSection] = useState('hero');
  const [scrollProgress, setScrollProgress] = useState(0);
  
  // Create a ref object to store section elements
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  
  // Set up section refs
  const setSectionRef = (id: string) => (el: HTMLDivElement | null) => {
    sectionRefs.current[id] = el;
  };

  // Effect to set mounted state and initial drawer state based on screen size
  useEffect(() => {
    setIsMounted(true);
    setDrawerOpen(!isMobile); // Set initial drawer state after mount
  }, [isMobile]);

  // Handle scroll events to update active section and progress
  useEffect(() => {
    if (!isMounted) return; // Only run scroll listener after mount

    const handleScroll = () => {
      // Calculate scroll progress
      const totalHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const progress = (window.scrollY / totalHeight) * 100;
      setScrollProgress(progress);

      // Determine active section based on scroll position
      const currentPosition = window.scrollY + 200;
      
      for (const id of Object.keys(sectionRefs.current)) {
        const element = sectionRefs.current[id];
        if (element) {
          const offsetTop = element.offsetTop;
          const height = element.offsetHeight;
          
          if (currentPosition >= offsetTop && currentPosition < offsetTop + height) {
            setActiveSection(id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle drawer toggle
  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  // Scroll to section
  const scrollToSection = (id: string) => {
    const element = sectionRefs.current[id];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setActiveSection(id);
      if (isMobile) {
        setDrawerOpen(false);
      }
    }
  };

  // Scroll to top
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Drawer content
  const drawerContent = (
    <Box sx={{ width: 280, pt: 2 }}>
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center',
        p: 2
      }}>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
          Bewakoof.com Proposal
        </Typography>
        <LinearProgress 
          variant="determinate" 
          value={scrollProgress} 
          sx={{ 
            width: '100%', 
            height: 6, 
            borderRadius: 3,
            mb: 2,
            '& .MuiLinearProgress-bar': {
              backgroundColor: theme.palette.primary.main,
            }
          }} 
        />
      </Box>
      <Divider />
      <List>
        {sections.map((section) => (
          <ListItem key={section.id} disablePadding>
            <ListItemButton
              selected={activeSection === section.id}
              onClick={() => scrollToSection(section.id)}
              sx={{
                borderRadius: 2,
                mx: 1,
                '&.Mui-selected': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  color: theme.palette.primary.main,
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.2),
                  },
                  '& .MuiListItemIcon-root': {
                    color: theme.palette.primary.main,
                  },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                {section.icon}
              </ListItemIcon>
              <ListItemText primary={section.name} />
              {activeSection === section.id && (
                <Box
                  sx={{
                    width: 4,
                    height: 20,
                    backgroundColor: theme.palette.primary.main,
                    borderRadius: 4,
                  }}
                />
              )}
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Divider sx={{ my: 2 }} />
      <Box sx={{ p: 2 }}>
        <Paper
          elevation={0}
          sx={{
            p: 2,
            backgroundColor: alpha(theme.palette.primary.main, 0.05),
            borderRadius: 2,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
          }}
        >
          <Typography variant="body2" fontWeight={500} color="text.secondary">
            Prepared by Trayarunya Ventures for Bewakoof.com to enhance digital marketing strategy and drive growth.
          </Typography>
        </Paper>
      </Box>
    </Box>
  );

  // Background decorative elements with client-side only rendering
  const BackgroundDecorations = () => {
    const [isMounted, setIsMounted] = useState(false);
    
    // Only render on client-side to avoid hydration mismatch
    useEffect(() => {
      setIsMounted(true);
    }, []);
    
    if (!isMounted) return null;
    
    return (
      <>
        <Box
          sx={{
            position: 'fixed',
            top: '10%',
            right: '5%',
            width: 300,
            height: 300,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.1)} 0%, rgba(255,255,255,0) 70%)`,
            zIndex: -1,
          }}
        />
        <Box
          sx={{
            position: 'fixed',
            bottom: '15%',
            left: '5%',
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${alpha(theme.palette.secondary.main, 0.1)} 0%, rgba(255,255,255,0) 70%)`,
            zIndex: -1,
          }}
        />
        <Box
          sx={{
            position: 'fixed',
            top: '40%',
            left: '10%',
            width: 150,
            height: 150,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${alpha(theme.palette.warning.main, 0.05)} 0%, rgba(255,255,255,0) 70%)`,
            zIndex: -1,
          }}
        />
      </>
    );
  };

  // Section wrapper without animations
  const SectionWrapper = ({ id, children }: { id: string; children: React.ReactNode }) => (
    <Box
      ref={setSectionRef(id)}
      sx={{ 
        scrollMarginTop: '80px', // Keep scroll margin for navigation
        position: 'relative',
        pt: 4, // Add some padding top for spacing
        pb: 4, // Add some padding bottom for spacing
      }}
    >
      {children}
      
      {id !== 'conclusion' && (
        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            my: 6 
          }}
        >
          <Box 
            sx={{
              width: '80%',
              height: 2,
              background: `linear-gradient(90deg, rgba(255,255,255,0) 0%, ${alpha(theme.palette.divider, 0.5)} 50%, rgba(255,255,255,0) 100%)`,
            }}
          />
        </Box>
      )}
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100vh', position: 'relative' }}>
      <BackgroundDecorations />
      
      {/* Render client-dependent UI only after mount */}
      {isMounted && (
        <>
          {/* Mobile menu toggle */}
          {isMobile && (
            <Fab
              color="primary"
              aria-label="menu"
              onClick={toggleDrawer}
              sx={{
                position: 'fixed',
                top: 20,
                left: 20,
                zIndex: 1100,
              }}
              size="medium"
            >
              <MenuIcon />
            </Fab>
          )}
          
          {/* Scroll to top button */}
          <Tooltip title="Scroll to top">
            <Fab
              color="primary"
              aria-label="scroll-to-top"
              onClick={scrollToTop}
              sx={{
                position: 'fixed',
                bottom: 20,
                right: 20,
                zIndex: 1000,
                opacity: scrollProgress > 20 ? 1 : 0,
                transition: 'opacity 0.3s ease',
              }}
              size="medium"
            >
              <KeyboardArrowUpIcon />
            </Fab>
          </Tooltip>
          
          {/* Navigation drawer */}
          <Drawer
            variant={isMobile ? 'temporary' : 'persistent'}
            open={drawerOpen}
            onClose={toggleDrawer}
            sx={{
              width: drawerOpen ? 280 : 0,
              flexShrink: 0,
              '& .MuiDrawer-paper': {
                width: 280,
                boxSizing: 'border-box',
                border: 'none',
                boxShadow: '0 0 20px rgba(0,0,0,0.05)',
              },
            }}
          >
            {drawerContent}
          </Drawer>
        </>
      )}
      
      {/* Main content */}
      <Box
        sx={{
          flexGrow: 1,
          // Adjust margin based on drawer state only after mount
          ml: { md: isMounted && drawerOpen ? '280px' : 0 }, 
          transition: theme.transitions.create(['margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        <Container maxWidth="lg" sx={{ py: 8 }}>
          {/* Progress indicator for mobile */}
          {isMounted && isMobile && (
            <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000 }}>
              <LinearProgress 
                variant="determinate" 
                value={scrollProgress} 
                sx={{ 
                  height: 4,
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: theme.palette.primary.main,
                  }
                }} 
              />
            </Box>
          )}
          
          {/* Sections */}
          <div>
            <SectionWrapper key="hero" id="hero">
              <HeroSection />
            </SectionWrapper>
            
            <SectionWrapper key="icp" id="icp">
              <ICPSection />
            </SectionWrapper>
            
            <SectionWrapper key="competitors" id="competitors">
              <CompetitorAnalysisSection />
            </SectionWrapper>
            
            <SectionWrapper key="strategy" id="strategy">
              <MarketingStrategySection />
            </SectionWrapper>
            
            <SectionWrapper key="calendar" id="calendar">
              <ContentCalendarSection />
            </SectionWrapper>
            
            <SectionWrapper key="conclusion" id="conclusion">
              <ConclusionSection />
            </SectionWrapper>
          </div>
          
          {/* Next section navigation */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8, mb: 4 }}>
            {sections.map((section, index) => {
              if (section.id === activeSection && index < sections.length - 1) {
                const nextSection = sections[index + 1];
                return (
                  <Box 
                    key={section.id}
                    onClick={() => scrollToSection(nextSection.id)}
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      p: 2,
                      borderRadius: 2,
                      cursor: 'pointer',
                      backgroundColor: alpha(theme.palette.primary.main, 0.05),
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.1),
                      }
                    }}
                  >
                    <Typography variant="body1" fontWeight={500} sx={{ mr: 1 }}>
                      Next: {nextSection.name}
                    </Typography>
                    <ArrowForwardIcon fontSize="small" />
                  </Box>
                );
              }
              return null;
            })}
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default BewakoofProposal;
