'use client';

import React, { useState } from 'react';
import {
    Box, Typography, Paper, TextField, Button,
    Alert, CircularProgress, RadioGroup,
    FormControlLabel, Radio, FormControl, FormLabel
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import CheckIcon from '@mui/icons-material/Check';

const EmailTestPage: React.FC = () => {
    const [formData, setFormData] = useState({
        name: 'Test User',
        email: 'test@example.com',
        subject: 'Test Contact Email',
        message: 'This is a test message to verify the email functionality is working properly.',
        company: 'Test Company',
        phone: '+1234567890',
        emailType: 'both' as 'both' | 'admin-only',
    });

    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [smtpConfig, setSmtpConfig] = useState<any>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    };

    const checkSmtpConfig = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/contact-email');
            const data = await response.json();

            if (response.ok) {
                setSmtpConfig(data);
                setError(null);
            } else {
                setError(data.error || 'Failed to check SMTP configuration');
            }
        } catch (err) {
            setError('Network error while checking SMTP configuration');
        } finally {
            setLoading(false);
        }
    };

    const sendTestEmail = async () => {
        try {
            setLoading(true);
            setError(null);
            setResult(null);

            const response = await fetch('/api/contact-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (response.ok) {
                setResult(data);
            } else {
                setError(data.error || 'Failed to send email');
            }
        } catch (err) {
            setError('Network error while sending email');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
            <Typography variant="h4" gutterBottom>
                Email Testing - Contact Form
            </Typography>

            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                    SMTP Configuration Check
                </Typography>

                <Button
                    variant="outlined"
                    onClick={checkSmtpConfig}
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} /> : <CheckIcon />}
                    sx={{ mb: 2 }}
                >
                    Check SMTP Configuration
                </Button>

                {smtpConfig && (
                    <Alert severity="success" sx={{ mt: 2 }}>
                        <Typography variant="subtitle2">SMTP Configuration Valid:</Typography>
                        <Typography variant="body2">
                            Host: {smtpConfig.config.host}<br />
                            Port: {smtpConfig.config.port}<br />
                            User: {smtpConfig.config.user}<br />
                            From Email: {smtpConfig.config.fromEmail}<br />
                            Test Email: {smtpConfig.config.testEmail}
                        </Typography>
                    </Alert>
                )}
            </Paper>

            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Test Email Form
                </Typography>

                <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                        name="name"
                        label="Name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        fullWidth
                    />

                    <TextField
                        name="email"
                        label="Email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        fullWidth
                    />

                    <TextField
                        name="company"
                        label="Company"
                        value={formData.company}
                        onChange={handleChange}
                        fullWidth
                    />

                    <TextField
                        name="phone"
                        label="Phone"
                        value={formData.phone}
                        onChange={handleChange}
                        fullWidth
                    />

                    <TextField
                        name="subject"
                        label="Subject"
                        value={formData.subject}
                        onChange={handleChange}
                        required
                        fullWidth
                    />

                    <TextField
                        name="message"
                        label="Message"
                        value={formData.message}
                        onChange={handleChange}
                        required
                        multiline
                        rows={4}
                        fullWidth
                    />

                    <FormControl>
                        <FormLabel>Email Type</FormLabel>
                        <RadioGroup
                            name="emailType"
                            value={formData.emailType}
                            onChange={handleChange}
                            row
                        >
                            <FormControlLabel value="both" control={<Radio />} label="Both (Admin + Customer)" />
                            <FormControlLabel value="admin-only" control={<Radio />} label="Admin Only" />
                        </RadioGroup>
                    </FormControl>

                    <Button
                        variant="contained"
                        onClick={sendTestEmail}
                        disabled={loading}
                        startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
                        sx={{ mt: 2 }}
                    >
                        {loading ? 'Sending...' : 'Send Test Email'}
                    </Button>
                </Box>
            </Paper>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    <Typography variant="subtitle2">Error:</Typography>
                    <Typography variant="body2">{error}</Typography>
                </Alert>
            )}

            {result && (
                <Alert severity="success" sx={{ mb: 3 }}>
                    <Typography variant="subtitle2">Success!</Typography>
                    <Typography variant="body2">
                        {result.message}<br />
                        Email Type: {result.emailType}<br />
                        Results: {JSON.stringify(result.result, null, 2)}
                    </Typography>
                </Alert>
            )}

            <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Instructions
                </Typography>
                <Typography variant="body2" component="div">
                    <ol>
                        <li>First, click "Check SMTP Configuration" to verify your email settings</li>
                        <li>Fill out the test form with sample data (or modify the pre-filled data)</li>
                        <li>Choose email type:
                            <ul>
                                <li><strong>Both:</strong> Sends admin notification to sumitshrm12@gmail.com AND customer confirmation to the email in the form</li>
                                <li><strong>Admin Only:</strong> Sends only admin notification to sumitshrm12@gmail.com</li>
                            </ul>
                        </li>
                        <li>Click "Send Test Email" to test the functionality</li>
                        <li>Check the email inbox(es) to verify delivery</li>
                    </ol>
                </Typography>
            </Paper>
        </Box>
    );
};

export default EmailTestPage;
