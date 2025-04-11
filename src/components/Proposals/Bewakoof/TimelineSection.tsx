'use client';

import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Card,
  CardContent,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  useTheme,
  alpha,
  Grid,
} from '@mui/material';
import {
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Flag as FlagIcon,
  Event as EventIcon,
  Timeline as TimelineIcon,
  CalendarToday as CalendarTodayIcon,
  DateRange as DateRangeIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';

const TimelineSection = () => {
  const theme = useTheme();

  // Animation variants
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: [0.4, 0, 0.2, 1],
      },
    },
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3,
      },
    },
  };

  // Project phases data
  const projectPhases = [
    {
      name: "Phase 1: Discovery & Strategy",
      duration: "Weeks 1-2",
      description: "Deep dive into Bewakoof's current marketing efforts, audience, and competitive landscape to refine our approach.",
      milestones: [
        "Complete brand audit and competitive analysis",
        "Finalize target audience segments and personas",
        "Develop detailed marketing strategy document",
        "Kickoff meeting and strategy presentation"
      ],
      deliverables: [
        "Comprehensive marketing strategy document",
        "Audience persona profiles",
        "Competitive analysis report",
        "SWOT analysis"
      ],
      color: theme.palette.primary.main
    },
    {
      name: "Phase 2: Content Development",
      duration: "Weeks 3-6",
      description: "Create high-quality content assets aligned with the strategy for various channels and campaign needs.",
      milestones: [
        "Develop content calendar for first quarter",
        "Create templates for recurring content types",
        "Produce initial batch of high-priority content",
        "Set up content management workflow"
      ],
      deliverables: [
        "Content calendar with publishing schedule",
        "Brand voice and style guide",
        "Initial content assets (social posts, blog articles, etc.)",
        "Content performance tracking framework"
      ],
      color: theme.palette.secondary.main
    },
    {
      name: "Phase 3: Campaign Launch & Optimization",
      duration: "Weeks 7-16",
      description: "Execute marketing campaigns across channels, monitor performance, and optimize based on data insights.",
      milestones: [
        "Launch awareness campaigns on primary channels",
        "Implement retargeting and conversion campaigns",
        "Weekly performance reviews and optimizations",
        "Mid-point strategy review and adjustments"
      ],
      deliverables: [
        "Campaign performance reports",
        "Optimization recommendations",
        "A/B testing results and insights",
        "Updated campaign assets based on performance"
      ],
      color: theme.palette.warning.main
    },
    {
      name: "Phase 4: Analysis & Planning",
      duration: "Weeks 17-20",
      description: "Comprehensive analysis of campaign results, ROI calculation, and planning for the next quarter.",
      milestones: [
        "Compile comprehensive performance data",
        "Conduct ROI analysis across channels and campaigns",
        "Present results and insights to stakeholders",
        "Develop recommendations for next quarter"
      ],
      deliverables: [
        "Comprehensive performance report",
        "ROI analysis document",
        "Presentation of results and insights",
        "Strategic recommendations for next quarter"
      ],
      color: theme.palette.success.main
    }
  ];

  // Key milestones for the timeline
  const keyMilestones = [
    {
      date: "Week 1",
      title: "Project Kickoff",
      description: "Initial meeting with Bewakoof team to align on goals, expectations, and project plan.",
      icon: <FlagIcon />,
      color: theme.palette.primary.main
    },
    {
      date: "Week 2",
      title: "Strategy Approval",
      description: "Presentation and approval of comprehensive marketing strategy and approach.",
      icon: <CheckCircleIcon />,
      color: theme.palette.primary.dark
    },
    {
      date: "Week 6",
      title: "Content Package Delivery",
      description: "Delivery of initial content package and content calendar for review and approval.",
      icon: <EventIcon />,
      color: theme.palette.secondary.main
    },
    {
      date: "Week 8",
      title: "Campaign Launch",
      description: "Official launch of marketing campaigns across all planned channels.",
      icon: <TimelineIcon />,
      color: theme.palette.warning.main
    },
    {
      date: "Week 12",
      title: "Mid-Project Review",
      description: "Comprehensive review of campaign performance and strategy adjustments.",
      icon: <CalendarTodayIcon />,
      color: theme.palette.warning.dark
    },
    {
      date: "Week 20",
      title: "Final Presentation",
      description: "Presentation of campaign results, insights, and recommendations for next steps.",
      icon: <DateRangeIcon />,
      color: theme.palette.success.main
    }
  ];

  return (
    <Box
      component={motion.div}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={fadeIn}
    >
      <Typography
        variant="h3"
        component="h2"
        sx={{
          mb: 2,
          fontWeight: 700,
          background: `linear-gradient(90deg, #000000 0%, #333333 100%)`,
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        Project Timeline & Roadmap
      </Typography>

      <Typography
        variant="h5"
        component="h3"
        sx={{
          mb: 4,
          fontWeight: 600,
          color: theme.palette.primary.main,
        }}
      >
        5-Month Implementation Plan
      </Typography>

      <Box sx={{ mb: 6 }}>
        <Typography variant="body1" sx={{ mb: 3 }}>
          Our proposed timeline outlines a structured approach to implementing the marketing strategy for Bewakoof.
          The plan spans 20 weeks (approximately 5 months) and is divided into four distinct phases, each with clear
          milestones and deliverables to ensure transparent progress tracking and accountability.
        </Typography>
      </Box>

      {/* Project Phases */}
      <Box sx={{ mb: 8 }}>
        <Typography
          variant="h4"
          component="h3"
          sx={{
            mb: 4,
            fontWeight: 700,
          }}
        >
          Project Phases
        </Typography>

        <Stepper orientation="vertical">
          {projectPhases.map((phase, index) => (
            <Step key={index} active={true}>
              <StepLabel
                StepIconComponent={() => (
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      backgroundColor: alpha(phase.color, 0.1),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: phase.color,
                    }}
                  >
                    <ScheduleIcon />
                  </Box>
                )}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                  <Typography variant="h6" fontWeight={600}>
                    {phase.name}
                  </Typography>
                  <Chip
                    label={phase.duration}
                    size="small"
                    sx={{
                      ml: 1,
                      fontWeight: 600,
                      backgroundColor: alpha(phase.color, 0.1),
                      color: phase.color,
                    }}
                  />
                </Box>
              </StepLabel>
              <StepContent>
                <Box sx={{ ml: 1, mt: 2 }}>
                  <Typography variant="body1" sx={{ mb: 3 }}>
                    {phase.description}
                  </Typography>

                  <Box sx={{ display: 'flex', flexWrap: 'wrap', mx: -1.5 }}>
                    <Box sx={{ width: { xs: '100%', md: '50%' }, px: 1.5, mb: { xs: 3, md: 0 } }}>
                      <Box
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          backgroundColor: alpha(phase.color, 0.05),
                          height: '100%',
                        }}
                      >
                        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                          Key Milestones
                        </Typography>
                        <List disablePadding dense>
                          {phase.milestones.map((milestone, idx) => (
                            <ListItem key={idx} disableGutters sx={{ pb: 1 }}>
                              <ListItemIcon sx={{ minWidth: 28 }}>
                                <Chip
                                  size="small"
                                  label={idx + 1}
                                  sx={{
                                    backgroundColor: alpha(phase.color, 0.1),
                                    color: phase.color,
                                    fontWeight: 'bold',
                                    height: 24,
                                    width: 24,
                                  }}
                                />
                              </ListItemIcon>
                              <ListItemText primary={milestone} />
                            </ListItem>
                          ))}
                        </List>
                      </Box>
                    </Box>
                    <Box sx={{ width: { xs: '100%', md: '50%' }, px: 1.5 }}>
                      <Box
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          backgroundColor: alpha(phase.color, 0.05),
                          height: '100%',
                        }}
                      >
                        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                          Deliverables
                        </Typography>
                        <List disablePadding dense>
                          {phase.deliverables.map((deliverable, idx) => (
                            <ListItem key={idx} disableGutters sx={{ pb: 1 }}>
                              <ListItemIcon sx={{ minWidth: 28 }}>
                                <Chip
                                  size="small"
                                  label="✓"
                                  sx={{
                                    backgroundColor: alpha(phase.color, 0.1),
                                    color: phase.color,
                                    fontWeight: 'bold',
                                    height: 24,
                                    width: 24,
                                  }}
                                />
                              </ListItemIcon>
                              <ListItemText primary={deliverable} />
                            </ListItem>
                          ))}
                        </List>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              </StepContent>
            </Step>
          ))}
        </Stepper>
      </Box>

      {/* Key Milestones */}
      <Box sx={{ mb: 6 }}>
        <Typography
          variant="h4"
          component="h3"
          sx={{
            mb: 4,
            fontWeight: 700,
          }}
        >
          Key Milestones
        </Typography>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', mx: -1.5 }}>
          {keyMilestones.map((milestone, index) => (
            <Box key={index} sx={{ width: { xs: '100%', sm: '50%', md: '33.33%' }, px: 1.5, mb: 3 }}>
              <Card
                component={motion.div}
                variants={fadeIn}
                sx={{
                  height: '100%',
                  borderRadius: 4,
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.05)',
                  overflow: 'hidden',
                  position: 'relative',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: '0 16px 40px rgba(0, 0, 0, 0.1)',
                  },
                  transition: 'all 0.3s ease',
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      mb: 2,
                    }}
                  >
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        backgroundColor: alpha(milestone.color, 0.1),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mr: 2,
                        color: milestone.color,
                      }}
                    >
                      {milestone.icon}
                    </Box>
                    <Box>
                      <Typography variant="h6" fontWeight={600}>
                        {milestone.title}
                      </Typography>
                      <Chip
                        label={milestone.date}
                        size="small"
                        sx={{
                          mt: 0.5,
                          fontWeight: 600,
                          backgroundColor: alpha(milestone.color, 0.1),
                          color: milestone.color,
                        }}
                      />
                    </Box>
                  </Box>

                  <Typography variant="body2" color="text.secondary">
                    {milestone.description}
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Timeline Considerations */}
      <Box sx={{ mb: 4 }}>
        <Paper
          elevation={0}
          sx={{
            p: 4,
            borderRadius: 4,
            backgroundColor: alpha(theme.palette.background.paper, 0.6),
            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
          }}
        >
          <Typography
            variant="h5"
            component="h3"
            sx={{
              mb: 3,
              fontWeight: 700,
            }}
          >
            Timeline Considerations
          </Typography>

          <Typography variant="body1" sx={{ mb: 3 }}>
            This timeline is designed to be flexible and can be adjusted based on Bewakoof's specific needs and priorities. 
            A few important considerations:
          </Typography>

          <List>
            <ListItem>
              <ListItemIcon>
                <Chip
                  size="small"
                  label="•"
                  sx={{
                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                    color: theme.palette.primary.main,
                    fontWeight: 'bold',
                    height: 24,
                    width: 24,
                  }}
                />
              </ListItemIcon>
              <ListItemText 
                primary="The timeline assumes prompt feedback and approvals from Bewakoof's team at key milestones." 
                secondary="Delays in feedback may impact the overall timeline."
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <Chip
                  size="small"
                  label="•"
                  sx={{
                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                    color: theme.palette.primary.main,
                    fontWeight: 'bold',
                    height: 24,
                    width: 24,
                  }}
                />
              </ListItemIcon>
              <ListItemText 
                primary="We've built in buffer time for revisions and adjustments based on performance data." 
                secondary="This ensures we can optimize campaigns for maximum effectiveness."
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <Chip
                  size="small"
                  label="•"
                  sx={{
                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                    color: theme.palette.primary.main,
                    fontWeight: 'bold',
                    height: 24,
                    width: 24,
                  }}
                />
              </ListItemIcon>
              <ListItemText 
                primary="The timeline can be accelerated for high-priority initiatives if needed." 
                secondary="We can discuss specific areas where you'd like to see faster implementation."
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <Chip
                  size="small"
                  label="•"
                  sx={{
                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                    color: theme.palette.primary.main,
                    fontWeight: 'bold',
                    height: 24,
                    width: 24,
                  }}
                />
              </ListItemIcon>
              <ListItemText 
                primary="Weekly status meetings will be scheduled to ensure alignment and address any concerns." 
                secondary="These meetings help us stay agile and responsive to changing needs."
              />
            </ListItem>
          </List>
        </Paper>
      </Box>
    </Box>
  );
};

export default TimelineSection;
