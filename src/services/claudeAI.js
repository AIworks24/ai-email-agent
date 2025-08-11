const axios = require('axios');

class ClaudeAIService {
    constructor() {
        this.apiKey = process.env.ANTHROPIC_API_KEY;
        this.baseURL = 'https://api.anthropic.com/v1/messages';
    }

    async processEmailQuery(query, emailData, calendarData = null) {
        const prompt = this.buildEmailQueryPrompt(query, emailData, calendarData);
        
        try {
            const response = await axios.post(this.baseURL, {
                model: 'claude-sonnet-4-20250514',
                max_tokens: 1500,
                messages: [
                    { role: 'user', content: prompt }
                ]
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.apiKey,
                    'anthropic-version': '2023-06-01'
                }
            });

            return response.data.content[0].text;
        } catch (error) {
            console.error('Error calling Claude API:', error.response?.data || error.message);
            throw new Error('AI processing failed');
        }
    }

    buildEmailQueryPrompt(query, emailData, calendarData) {
        let prompt = `You are an AI assistant helping to manage Microsoft 365 emails and calendar. Provide helpful, concise responses.

User Query: ${query}

Recent Email Data:
${this.formatEmailsForPrompt(emailData)}`;

        if (calendarData && calendarData.length > 0) {
            prompt += `\n\nUpcoming Calendar Events:
${this.formatCalendarForPrompt(calendarData)}`;
        }

        prompt += `\n\nProvide a helpful response to the user's query. Be specific and actionable.`;

        return prompt;
    }

    formatEmailsForPrompt(emails) {
        if (!emails || emails.length === 0) {
            return "No recent emails found.";
        }

        return emails.slice(0, 20).map((email, index) => {
            const from = email.from?.emailAddress?.address || 'Unknown sender';
            const name = email.from?.emailAddress?.name || '';
            const date = new Date(email.receivedDateTime).toLocaleDateString();
            const time = new Date(email.receivedDateTime).toLocaleTimeString();
            const preview = email.bodyPreview?.substring(0, 100) || 'No preview';
            
            return `${index + 1}. From: ${name} <${from}>
   Subject: ${email.subject}
   Date: ${date} ${time}
   Read: ${email.isRead ? 'Yes' : 'No'}
   Preview: ${preview}...`;
        }).join('\n\n');
    }

    formatCalendarForPrompt(events) {
        if (!events || events.length === 0) {
            return "No upcoming events found.";
        }

        return events.slice(0, 10).map((event, index) => {
            const start = new Date(event.start.dateTime).toLocaleString();
            const end = new Date(event.end.dateTime).toLocaleString();
            const location = event.location?.displayName || 'No location';
            
            return `${index + 1}. ${event.subject}
   Start: ${start}
   End: ${end}
   Location: ${location}`;
        }).join('\n\n');
    }

    async generateEmailResponse(originalEmail, context = '', tone = 'professional') {
        const prompt = `Generate a ${tone} email response to the following email:

Original Email:
From: ${originalEmail.from?.emailAddress?.name} <${originalEmail.from?.emailAddress?.address}>
Subject: ${originalEmail.subject}
Content: ${originalEmail.body?.content || originalEmail.bodyPreview}

Additional Context: ${context}

Generate an appropriate response that:
- Addresses the main points of the original email
- Maintains a ${tone} tone
- Is concise but complete
- Includes a proper greeting and closing

Return only the email content without subject line.`;

        try {
            const response = await axios.post(this.baseURL, {
                model: 'claude-sonnet-4-20250514',
                max_tokens: 800,
                messages: [
                    { role: 'user', content: prompt }
                ]
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.apiKey,
                    'anthropic-version': '2023-06-01'
                }
            });

            return response.data.content[0].text;
        } catch (error) {
            console.error('Error generating email response:', error.response?.data || error.message);
            throw new Error('Failed to generate email response');
        }
    }
}

module.exports = ClaudeAIService;