# FinMate - AI-Powered Trading Assistant

FinMate is a modern, AI-powered trading platform that helps you make informed investment decisions. With real-time market data, portfolio tracking, and an intelligent trading assistant, FinMate makes stock trading accessible and efficient.

## Features

- 🤖 **AI Trading Assistant**: Get personalized trading advice and market insights
- 📊 **Real-time Portfolio Tracking**: Monitor your investments with live updates
- 💰 **Paper Trading**: Practice trading with virtual money
- 📈 **Market Analysis**: Access real-time stock data and analytics
- 💬 **Conversation History**: Keep track of your interactions with the AI assistant
- 🔒 **Secure Authentication**: Powered by Supabase for robust user management

## Tech Stack

- **Frontend**: React, TypeScript, Vite
- **UI Components**: Shadcn/UI, Tailwind CSS
- **State Management**: React Query
- **Authentication**: Supabase Auth
- **Database**: Supabase PostgreSQL
- **APIs**: 
  - Alpaca Trading API (Paper Trading)
  - Alpha Vantage (Market Data)
  - Google Gemini (AI Assistant)

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/finmate.git
   cd finmate
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file with the following:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_ALPACA_API_KEY=your_alpaca_api_key
   VITE_ALPACA_API_SECRET=your_alpaca_secret
   VITE_GEMINI_API_KEY=your_gemini_api_key
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## Project Structure

```
finmate/
├── src/
│   ├── components/     # Reusable UI components
│   ├── context/       # React context providers
│   ├── hooks/         # Custom React hooks
│   ├── lib/           # Utility functions and configurations
│   ├── pages/         # Application pages/routes
│   └── types/         # TypeScript type definitions
├── supabase/
│   ├── functions/     # Edge Functions
│   └── migrations/    # Database migrations
└── public/           # Static assets
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Shadcn/UI](https://ui.shadcn.com/) for the beautiful UI components
- [Supabase](https://supabase.com/) for the backend infrastructure
- [Alpaca](https://alpaca.markets/) for the trading API
- [Google Gemini](https://deepmind.google/technologies/gemini/) for the AI capabilities
