import {GoogleGenAI} from '@google/genai';
import dotenv from "dotenv"

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({apiKey: GEMINI_API_KEY});

/**
 * Streaming version of LeetcodeProfileRoaster
 * @param {Object} leetcodeData - LeetCode user data
 * @returns {AsyncGenerator<string>} - yields text chunks as they arrive
 */



//leetcode profile roaster function
export async function* LeetcodeProfileRoaster(leetcodeData){
try {

    // If API failed, instruct Gemini to respond accordingly
    if (leetcodeData.apiError) {
      const prompt = `
      We tried to fetch LeetCode data for user "${leetcodeData.username}" but our backend failed to get the data due to an error on our side (external API failure). Please roast us (the backend team) for failing to get the data, and let the user know it's our fault, not theirs. Be funny, self-deprecating, and include emojis and answer only in 3 to 4 lines not more than that
      `;
      
    }

    // If user not found, instruct Gemini to respond accordingly
    if (leetcodeData.userNotFound) {
      const prompt = `
      We tried to fetch LeetCode data for user "${leetcodeData.username}" but they do not exist on LeetCode. Please roast us (the backend team) for failing to find the user, and let the requester know that the user does not exist, so you can't roast them. Be funny, self-deprecating, and include emojis and make sure to not answer in not more than 4-5 lines.
      `;
    }

    // Check if the data indicates user doesn't exist
    if (leetcodeData.errors && 
        leetcodeData.errors.some(err => err.message === "That user does not exist.") &&
        leetcodeData.data.matchedUser === null) {
      return "No data found, user does not exist. I can't roast what isn't there !!";
    }
    
    const prompt = `
    You need to behave as a professional roaster reviewing a LeetCode user.
    
    LeetCode User: ${leetcodeData.username}
    Real Name: ${leetcodeData.name || 'Not provided'}
    About: ${leetcodeData.about || 'No bio provided'}
    Country: ${leetcodeData.country || 'Unknown'}
    Company: ${leetcodeData.company || 'Unemployed/Not specified'}
    School: ${leetcodeData.school || 'Not specified'}
    Job Title: ${leetcodeData.jobTitle || 'Not specified'}
    
    Social Links:
    - GitHub: ${leetcodeData.githubUrl || 'None'}
    - LinkedIn: ${leetcodeData.linkedinUrl || 'None'}
    - Twitter: ${leetcodeData.twitterUrl || 'None'}
    
    LeetCode Stats:
    - Global Ranking: ${leetcodeData.ranking ? `#${leetcodeData.ranking}` : 'Not ranked/Too low to show'}
    - Contest Rating: ${leetcodeData.rating || 'No rating/Never participated'}
    - Star Rating: ${leetcodeData.starRating || 'No stars'}
    - Reputation: ${leetcodeData.reputation || 0}
    
    Problem Solving Stats:
    - Total Solved: ${leetcodeData.totalSolved || 0}
    - Easy Solved: ${leetcodeData.easySolved || 0}
    - Medium Solved: ${leetcodeData.mediumSolved || 0}
    - Hard Solved: ${leetcodeData.hardSolved || 0}
    - Acceptance Rate: ${leetcodeData.acceptanceRate || 'N/A'}%
    
    Badges Earned: ${leetcodeData.badges?.length ? 
      leetcodeData.badges.map(badge => badge.displayName || badge.name).join(', ') : 
      'No badges - completely badge-less'}
    
    Programming Languages Used: ${leetcodeData.languageProblemCount?.length ? 
      leetcodeData.languageProblemCount.map(lang => `${lang.languageName}: ${lang.problemsSolved} problems`).join(', ') : 
      'No language data available'}
    
    Contest Badge: ${leetcodeData.contestBadge ? 
      `${leetcodeData.contestBadge.name} ${leetcodeData.contestBadge.expired ? '(EXPIRED!)' : ''}` : 
      'No contest achievements'}
    
    Roast this LeetCode profile mercilessly. Be creative, harsh, and funny. Use their personal info, stats, and achievements (or lack thereof) to craft targeted insults.
    
    Focus on:
    1. Their problem-solving patterns (easy vs hard ratio)
    2. Contest participation and performance
    3. Professional background vs coding skills
    4. Social media presence vs actual skills
    5. Badge collection (or embarrassing lack thereof)
    6. Language preferences and diversity
    7. Overall ranking and reputation
    
    Mock them for things like: avoiding hard problems, having no contest rating, working at a no-name company, having empty social profiles, collecting meaningless badges, or having a pathetic global ranking.
    
    Use strong language, be sarcastic, include pop culture references/meme refrences/ famous web series refrences and don't hold back. Include appropriate emojis to emphasize your points.
    
    Your response should be direct as if you're talking to them. Don't include any meta-text or labels.
    
    Keep your response in about 10-12 lines and not more than that. Make sure the roast is humorous but brutal which can even make them doubt their capabilities.
    
    Your entire response will be passed directly to a frontend, so only include the roast text.
    `;
    
    const responseStream = await ai.models.generateContentStream({
      model: "gemini-2.0-flash-001",
      contents: prompt,
    });
    // Yield chunks as they arrive
    for await (const chunk of responseStream) {
      yield chunk.text;
    }
  } catch (error) {
    console.error("Error generating LeetCode roast with Gemini:", error);
    throw new Error("Failed to generate LeetCode roast results");
  }
}