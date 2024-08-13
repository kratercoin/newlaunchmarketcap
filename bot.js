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

// Set to keep track of fetched tokens and their mint addresses
const fetchedTokens = new Set();

// Function to format market cap in USD
const formatMarketCap = (marketCap) => {
    if (marketCap < 1_000) return `$${marketCap.toFixed(2)}`;
    if (marketCap < 1_000_000) return `$${(marketCap / 1_000).toFixed(2)}k`;
    if (marketCap < 1_000_000_000) return `$${(marketCap / 1_000_000).toFixed(2)}M`;
    return `$${(marketCap / 1_000_000_000).toFixed(2)}B`;
};

// Function to fetch new tokens
const fetchNewTokens = async () => {
    try {
        const response = await axios.get('https://frontend-api.pump.fun/coins/latest');
        const tokenData = response.data;

        // Check if the token is new and hasn't been processed yet
        if (!fetchedTokens.has(tokenData.mint)) {
            fetchedTokens.add(tokenData.mint); // Mark this token as fetched

            // Display fetched token information in console
            console.log(`🔔 New Fetched Token: ${tokenData.name} (${tokenData.symbol})`);
            console.log(`Mint Address: ${tokenData.mint}`);

            // Immediately check the market cap for this new token
            await checkMarketCap(tokenData.mint);
        }

        // Call fetchNewTokens recursively to keep fetching new tokens
        setImmediate(fetchNewTokens);
    } catch (error) {
        console.error('Error fetching new tokens:', error);
        // Optionally set a delay before retrying
        setTimeout(fetchNewTokens, 5000); // Retry after 5 seconds
    }
};

// Function to check market cap of a token using its mint address
const checkMarketCap = async (mintAddress) => {
    try {
        const tradesResponse = await axios.get('https://frontend-api.pump.fun/trades/latest');
        const tradesData = tradesResponse.data;

        // Log the structure of tradesData for debugging
        console.log('Trades Data:', tradesData);

        // If tradesData is not an array, handle it accordingly
        if (!Array.isArray(tradesData)) {
            console.error('Expected tradesData to be an array, but got:', tradesData);
            return; // Exit the function if data is not in the expected format
        }

        // Find the trade for the specific mint address
        const tokenTrade = tradesData.find(trade => trade.mint === mintAddress);

        if (tokenTrade) {
            // Assuming market_cap is calculated based on some logic with the trade data
            const marketCapInSol = tokenTrade.sol_amount * (await getSolPrice());
            const formattedMarketCap = formatMarketCap(marketCapInSol);

            // Display market cap information in console
            console.log(`🔄 Updated Trade for ${mintAddress}: Market Cap is now ${formattedMarketCap}`);

            // Send market cap notification to Telegram if it meets the threshold
            if (marketCapInSol >= 10000) {
                const message = `📈 Token has reached a market cap of ${formattedMarketCap}\nMint Address: [${mintAddress}](https://explorer.pump.fun/address/${mintAddress})`;
                await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
                console.log('Market cap notification sent:', message);
            }
        } else {
            console.log(`No trade found for mint address: ${mintAddress}`);
        }
    } catch (error) {
        console.error('Error checking market cap:', error);
    }
};

// Function to get the current SOL price
const getSolPrice = async () => {
    try {
        const response = await axios.get('https://frontend-api.pump.fun/sol-price');
        return response.data.solPrice;
    } catch (error) {
        console.error('Error fetching SOL price:', error);
        return 0; // Return a default value if there's an error
    }
};

// Start fetching new tokens immediately
fetchNewTokens();

// Express server to keep the bot alive on Back4App
const app = express();
app.get('/', (req, res) => res.send('Bot is running!'));
app.listen(port, () => console.log(`Server is running on port ${port}`));
