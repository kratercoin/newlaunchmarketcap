import TelegramBot from 'node-telegram-bot-api';
import axios from 'axios';
import express from 'express';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Access environment variables
const token = process.env.TELEGRAM_BOT_API_KEY;
const chatId = process.env.CHAT_ID;
const port = process.env.PORT || 3000;

const bot = new TelegramBot(token, { polling: true });

// Keep track of fetched tokens and traded tokens
const fetchedTokens = new Set();
const tradedTokens = new Set();
let solPrice = 0;

// Function to fetch the current SOL price
const fetchSolPrice = async () => {
    try {
        const response = await axios.get('https://frontend-api.pump.fun/sol-price');
        solPrice = response.data.solPrice;
        console.log('Current SOL Price:', solPrice);
    } catch (error) {
        console.error('Error fetching SOL price:', error);
    }
};

// Function to format the market cap in USD
const formatMarketCap = (marketCapInSol) => {
    const marketCapInUsd = marketCapInSol * solPrice;
    if (marketCapInUsd < 1_000) return `$${marketCapInUsd.toFixed(2)}`;
    if (marketCapInUsd < 1_000_000) return `$${(marketCapInUsd / 1_000).toFixed(2)}k`;
    if (marketCapInUsd < 1_000_000_000) return `$${(marketCapInUsd / 1_000_000).toFixed(2)}M`;
    return `$${(marketCapInUsd / 1_000_000_000).toFixed(2)}B`;
};

// Function to fetch new tokens
const fetchNewTokens = async () => {
    try {
        const response = await axios.get('https://frontend-api.pump.fun/coins/latest');
        const tokenData = response.data;

        // Check if the token is new and hasn't been processed yet
        if (!fetchedTokens.has(tokenData.mint)) {
            fetchedTokens.add(tokenData.mint); // Mark this token as fetched

            const marketCapInSol = tokenData.market_cap; // Assuming market_cap is in SOL
            const formattedMarketCap = formatMarketCap(marketCapInSol);

            if (marketCapInSol >= 10000) {
                const message = `🚀 New Token: ${tokenData.name} (${tokenData.symbol}) has reached a market cap of ${formattedMarketCap}!`;
                await bot.sendMessage(chatId, message);
                console.log('Notification sent for new token:', message);
            } else {
                console.log(`New token ${tokenData.name} is below 10k market cap: ${formattedMarketCap}`);
            }
        }
    } catch (error) {
        console.error('Error fetching new tokens:', error);
    }
};

// Function to check trades for fetched tokens and their market caps
const checkTokenTrades = async () => {
    try {
        const response = await axios.get('https://frontend-api.pump.fun/trades/latest');
        const tradeData = response.data;

        // Track the mint address of the traded token
        const tokenMint = tradeData.mint;

        // If the token mint is in fetchedTokens, check its market cap
        if (fetchedTokens.has(tokenMint) && !tradedTokens.has(tokenMint)) {
            tradedTokens.add(tokenMint); // Mark this token as traded

            // Fetch the token data to get the market cap
            const tokenResponse = await axios.get(`https://frontend-api.pump.fun/coins/latest?mint=${tokenMint}`);
            const tokenDetails = tokenResponse.data;

            const marketCapInSol = tokenDetails.market_cap; // Assuming market_cap is in SOL
            const formattedMarketCap = formatMarketCap(marketCapInSol);

            const message = `🛒 Trade Alert:\nToken: ${tokenDetails.name} (${tokenDetails.symbol})\nMarket Cap: ${formattedMarketCap}\nAmount Sold: ${tradeData.token_amount}\nSOL Amount: ${tradeData.sol_amount}`;
            await bot.sendMessage(chatId, message);
            console.log('Trade update sent:', message);
        }
    } catch (error) {
        console.error('Error fetching trade data or token details:', error);
    }
};

// Check for new tokens every minute
setInterval(fetchNewTokens, 60 * 1000);

// Check for new trades every minute
setInterval(checkTokenTrades, 60 * 1000);

// Fetch the current SOL price initially and then every hour
fetchSolPrice();
setInterval(fetchSolPrice, 60 * 60 * 1000); // Fetch SOL price every hour

// Respond to the /start command
bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, 'Bot is running and will notify you about new tokens and trades!');
});

// Express server to keep the bot alive on Back4App
const app = express();

// Create a ping endpoint
app.get('/ping', (req, res) => {
    res.send('Bot is running');
});

// Start the Express server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
