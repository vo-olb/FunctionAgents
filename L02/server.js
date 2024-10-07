import express from 'express';
import bodyParser from 'body-parser';
import { OpenAI} from 'openai';
import path from 'path';
import { fileURLToPath } from 'url';
import { readdirSync } from 'fs';

// Initialize Express server
const app = express();
app.use(bodyParser.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// OpenAI API configuration
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Dynamically import functions
const importFunctions = async () => {
    const functionDir = path.join(__dirname, '../functions');
    const functionFiles = readdirSync(functionDir).filter(file => file.endsWith('.js'));
    const functions = {};

    for (const file of functionFiles) {
        const { execute, details } = await import(path.join(functionDir, file));
        functions[details.name] = { execute, details };
    }

    return functions;
};

// Route to interact with OpenAI API
app.post('/execute-function', async (req, res) => {
    const { functionName, parameters } = req.body;

    // Import all functions
    const functions = await importFunctions();

    if (!functions[functionName]) {
        return res.status(404).json({ error: 'Function not found' });
    }

    try {
        // Call the function
        const result = await functions[functionName].execute(...Object.values(parameters));
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: 'Function execution failed', details: err.message });
    }
});

// Example to interact with OpenAI API and get function descriptions
app.post('/openai-function-call', async (req, res) => {
    const { userPrompt } = req.body;

    const functions = await importFunctions();
    const availableFunctions = Object.values(functions).map(fn => fn.details);

    try {
        // Make OpenAI API call
        const response = await openai.createChatCompletion({
            model: 'gpt-3.5-turbo',
            messages: [
                { role: 'system', content: 'You are a helpful assistant.' },
                { role: 'user', content: userPrompt }
            ],
            functions: availableFunctions
        });

        const completion = response.data.choices[0];
        const calledFunction = completion.function_call;

        // If OpenAI calls a function, execute it
        if (calledFunction) {
            const functionName = calledFunction.name;
            const parameters = JSON.parse(calledFunction.arguments);

            const result = await functions[functionName].execute(...Object.values(parameters));
            res.json({ result });
        } else {
            res.json({ message: 'No function call detected.' });
        }

    } catch (error) {
        res.status(500).json({ error: 'OpenAI API failed', details: error.message });
    }
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
