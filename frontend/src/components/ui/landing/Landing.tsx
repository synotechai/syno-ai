import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Typography, Grid, Paper } from '@mui/material';
import { Build, Psychology, Cloud, Storage, RocketLaunch, Group, Chat } from '@mui/icons-material';
import theme from '../../../Theme';
import logo from '../../../assets/img/logo1024.png';
import { FlipWords } from '../aceternity/FlipWords';

const Landing: React.FC = () => {
    const navigate = useNavigate();

    const features = [
        {
            title: "Create your own Agents",
            description: "Build and deploy AI agents: choose their model, system prompt and skills (coding & tools)",
            icon: <Psychology sx={{ fontSize: 40 }} />,
            gridSize: { xs: 12, md: 4 }
        },
        {
            title: "Chat with your agents",
            description: "Choose the right agent for your goal. Chat with them and get things done",
            icon: <Chat sx={{ fontSize: 40 }} />,
            gridSize: { xs: 12, md: 8 }
        },
        {
            title: "Build & Execute Tasks",
            description: "Build, test and deploy your own tasks and workflows, execute them yourself or give them to your agents as tools",
            icon: <Build sx={{ fontSize: 40 }} />,
            gridSize: { xs: 12, md: 8 }
        },
        {
            title: "Use your favorite Models",
            description: "Connect your agents to any model from any of the available APIs",
            icon: <Cloud sx={{ fontSize: 40 }} />,
            gridSize: { xs: 12, md: 4 }
        },
        {
            title: "Data & Tools",
            description: "Leverage RAG, chain-of-thought, STT, TTS, Image generation and so much more to enhance your AI workflows",
            icon: <Storage sx={{ fontSize: 40 }} />,
            gridSize: { xs: 12, md: 4 }
        },
        {
            title: "Simple Deployment",
            description: "Deploy and scale your solutions with ease. Use your own API keys or subscribe to our service to cut through the noise",
            icon: <RocketLaunch sx={{ fontSize: 40 }} />,
            gridSize: { xs: 12, md: 4 }
        },
        {
            title: "Open Source",
            description: "Join our community and help shape the future of agentic workflows",
            icon: <Group sx={{ fontSize: 40 }} />,
            gridSize: { xs: 12, md: 4 }
        }
    ];

    const renderFeatureVisual = (title: string) => {
        switch (title) {
            case "Create your own Agents":
                return (
                    <Box sx={{
                        mt: 'auto',
                        width: '100%',
                        height: 200,
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        <img
                            src={logo}
                            alt="Create Agents"
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain',
                            }}
                        />
                    </Box>
                );
            case "Build & Execute Tasks":
                return (
                    <Box sx={{
                        mt: 'auto',
                        width: '100%',
                        height: 300,
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        <img
                            src="/shared/img/random/ai_working_2.png"
                            alt="AI Working"
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain',
                                objectPosition: 'bottom'
                            }}
                        />
                    </Box>
                );
            case "Use your favorite Models":
                return (
                    <Box sx={{
                        mt: 'auto',
                        width: '100%',
                        height: 300,
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        <img
                            src="/shared/img/diagrams/Available_LLM_APIs.png"
                            alt="Available APIs"
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain',
                                objectPosition: 'bottom'
                            }}
                        />
                    </Box>
                );
            case "Chat with your agents":
                return (
                    <Box sx={{
                        mt: 'auto',
                        width: '100%',
                        height: 300,
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        <img
                            src="/shared/img/frontend_screenshots/chat_interface.png"
                            alt="Chat Interface"
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain',
                                objectPosition: 'bottom'
                            }}
                        />
                    </Box>
                );
        }
    };
    const words = ['simplicity', 'transparency', 'fun', 'creativity', 'collaboration', 'privacy', 'security'];

    return (
        <Box sx={{
            minHeight: '100vh',
            py: 8,
            overflow: 'auto',
            px: 4
        }}>
            {/* Hero Section */}
            <Box sx={{
                textAlign: 'center',
                mb: 8
            }}>
                <Typography variant="h1" component="h1"
                    sx={{
                        fontWeight: 'bold',
                        mb: 2,
                        background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.secondary.main} 90%)`,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        fontSize: {
                            xs: '2.5rem',
                            sm: '4rem',
                            md: '6rem'
                        }
                    }}>
                    Project Alice
                </Typography>

                <Typography variant="h4" component="h2"
                    sx={{ mb: 4, color: theme.palette.text.secondary }}>
                    Where AI meets <FlipWords words={words} className={'text-white'} />
                </Typography>

                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mb: 6 }}>
                    <Button
                        variant="contained"
                        color="primary"
                        size="large"
                        onClick={() => navigate('/login')}
                    >
                        Login
                    </Button>
                    <Button
                        variant="contained"
                        color="secondary"
                        size="large"
                        onClick={() => navigate('/register')}
                    >
                        Register
                    </Button>
                </Box>
            </Box>

            {/* Features Grid */}
            <Grid container spacing={1} sx={{ maxWidth: '100%', mx: 'auto' }}>
                {features.map((feature, index) => (
                    <Grid item {...feature.gridSize} key={index}>
                        <Paper
                            elevation={3}
                            sx={{
                                p: 3,
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                textAlign: 'center',
                                bgcolor: theme.palette.background.paper,
                                transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                                '&:hover': {
                                    transform: 'translateY(-4px)',
                                    boxShadow: 6
                                }
                            }}
                        >
                            <Box sx={{ mb: 2, color: theme.palette.primary.main }}>
                                {feature.icon}
                            </Box>
                            <Typography variant="h5" component="h3" sx={{ mb: 2 }}>
                                {feature.title}
                            </Typography>
                            <Typography variant="body1" color="text.secondary">
                                {feature.description}
                            </Typography>

                            {renderFeatureVisual(feature.title)}
                        </Paper>
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
};

export default Landing;