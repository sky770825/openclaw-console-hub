// src/run.ts
import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs/promises';
import * as path from 'path';
import 'dotenv/config';

// Define the structure of our mission file
interface Mission {
  model: string;
  max_tokens: number;
  system_prompt: string;
  mission: string;
}

// Get the API key from environment variables
const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  throw new Error('ANTHROPIC_API_KEY is not set in the environment variables.');
}

const client = new Anthropic({ apiKey });

// The path to our dedicated mission file
const MISSION_FILE_PATH = path.join(__dirname, '..', 'mission.json');

// The main function to execute the mission
async function main() {
  console.log('🚀 L2 Sandbox Executor Activated (Protocol: Messenger).');
  console.log('------------------------------------');
  
  try {
    // 1. Read the mission from mission.json
    console.log(`[1/3] Reading mission from: ${MISSION_FILE_PATH}`);
    const missionContent = await fs.readFile(MISSION_FILE_PATH, 'utf-8');
    const mission: Mission = JSON.parse(missionContent);
    
    console.log('[2/3] Mission acquired. Engaging Claude Opus...');

    // 2. Call the Claude Opus model
    const response = await client.messages.create({
      model: mission.model,
      max_tokens: mission.max_tokens,
      system: mission.system_prompt,
      messages: [
        {
          role: 'user',
          content: mission.mission,
        }
      ]
    });

    console.log('[3/3] Claude Opus has responded. Mission accomplished.');
    console.log('------------------------------------');
    
    // 3. Inspect the response structure to find the correct way to access the text
    console.log('--- BEGIN L2 SANDBOX RAW OUTPUT ---');
    console.log(JSON.stringify(response.content, null, 2));
    console.log('--- END L2 SANDBOX RAW OUTPUT ---');

  } catch (error) {
    console.error('An error occurred in the L2 Sandbox:', error);
    process.exit(1);
  }
}

main();
