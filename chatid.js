import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Access the bot token from environment variables
const token = process.env.TELEGRAM_BOT_API_KEY;

// Check if the token is loaded correctly
if (!token) {
    console.error('Error: TELEGRAM_BOT_API_KEY is not set in the .env file.');
    process.exit(1);
}

// Create a new Telegram bot instance
const bot = new TelegramBot(token, { polling: true });

// Listen for any kind of message
bot.on('message', (msg) => {
    const chatId = msg.chat.id;

    if (chatId) {
        console.log('Chat ID:', chatId);
        bot.sendMessage(chatId, `Your Chat ID is: ${chatId}`);
    } else {
        console.log('Error: Chat ID not found.');
    }
});

console.log('Bot is running...');
