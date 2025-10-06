import express from "express";
import axios from "axios";
import { LeetcodeProfileRoaster } from "../services/ai-service.js"; // note .js extension

const router = express.Router();

const CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const leetcodeCache = {};

async function generateLeetcodeRoastWithGemini(leetcodeData) {
  return LeetcodeProfileRoaster(leetcodeData);
}

router.post("/leetcode-roast", async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }

    // Check cache
    let cached = leetcodeCache[username];
    let leetcodeData;
    let apiFailed = false;
    let userNotFound = false;

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      leetcodeData = cached.data;
    } else {
      try {
        const leetcodeResponse = await axios.post(
          "https://leetcode.com/graphql",
          {
            query: `query getFullProfile($username: String!) { 
              matchedUser(username: $username) { 
                username 
                githubUrl 
                linkedinUrl 
                twitterUrl 
                profile { 
                  realName 
                  userAvatar 
                  aboutMe 
                  countryName 
                  company 
                  school 
                  jobTitle 
                  ranking 
                  reputation 
                  starRating 
                } 
                badges { 
                  id 
                  name 
                  displayName 
                  icon 
                  creationDate 
                } 
                submitStats { 
                  acSubmissionNum { 
                    difficulty 
                    count 
                    submissions 
                  } 
                  totalSubmissionNum { 
                    difficulty 
                    count 
                    submissions 
                  } 
                } 
                languageProblemCount { 
                  languageName 
                  problemsSolved 
                } 
                contestBadge { 
                  name 
                  expired 
                  hoverText 
                  icon 
                } 
              } 
            }`,
            variables: { username },
          },
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (!leetcodeResponse.data || !leetcodeResponse.data.data) {
          apiFailed = true;
        } else if (leetcodeResponse.data.errors || !leetcodeResponse.data.data.matchedUser) {
          userNotFound = true;
        } else {
          const userData = leetcodeResponse.data.data.matchedUser;

          leetcodeData = {
            username: userData.username,
            name: userData.profile?.realName || userData.username,
            avatar: userData.profile?.userAvatar,
            about: userData.profile?.aboutMe,
            country: userData.profile?.countryName,
            company: userData.profile?.company,
            school: userData.profile?.school,
            jobTitle: userData.profile?.jobTitle,
            ranking: userData.profile?.ranking,
            reputation: userData.profile?.reputation,
            starRating: userData.profile?.starRating,
            githubUrl: userData.githubUrl,
            linkedinUrl: userData.linkedinUrl,
            twitterUrl: userData.twitterUrl,
            badges: userData.badges,
            submitStats: userData.submitStats,
            languageProblemCount: userData.languageProblemCount,
            contestBadge: userData.contestBadge,

            totalSolved:
              userData.submitStats?.acSubmissionNum?.reduce((total, stat) => total + stat.count, 0) || 0,
            easySolved:
              userData.submitStats?.acSubmissionNum?.find((stat) => stat.difficulty === "Easy")?.count || 0,
            mediumSolved:
              userData.submitStats?.acSubmissionNum?.find((stat) => stat.difficulty === "Medium")?.count || 0,
            hardSolved:
              userData.submitStats?.acSubmissionNum?.find((stat) => stat.difficulty === "Hard")?.count || 0,
            acceptanceRate:
              userData.submitStats?.acSubmissionNum && userData.submitStats?.totalSubmissionNum
                ? (
                    (userData.submitStats.acSubmissionNum.reduce((total, stat) => total + stat.count, 0) /
                      userData.submitStats.totalSubmissionNum.reduce((total, stat) => total + stat.count, 0)) *
                    100
                  ).toFixed(1)
                : 0,
            rating: userData.profile?.starRating || 0,
          };

          leetcodeCache[username] = {
            data: leetcodeData,
            timestamp: Date.now(),
          };
        }
      } catch (err) {
        console.error("LeetCode API error:", err.response?.data || err.message);
        apiFailed = true;
      }
    }

    if (apiFailed) {
      leetcodeData = { username, apiError: true };
    }

    if (userNotFound) {
      leetcodeData = { username, userNotFound: true };
    }

    const roastResult = await generateLeetcodeRoastWithGemini(leetcodeData);

    res.json({
      user: {
        username,
        avatarUrl: leetcodeData?.avatar || `https://ui-avatars.com/api/?name=${username}&background=random`,
        name: leetcodeData?.name || username,
      },
      leetcodeStats: {
        totalSolved: leetcodeData.totalSolved,
        easySolved: leetcodeData.easySolved,
        mediumSolved: leetcodeData.mediumSolved,
        hardSolved: leetcodeData.hardSolved,
        acceptanceRate: leetcodeData.acceptanceRate,
        rating: leetcodeData.rating,
        ranking: leetcodeData.ranking,
      },
      roastResult,
    });
  } catch (error) {
    console.error("LeetCode Roast error:", error);
    res.status(500).json({
      error: "Failed to generate LeetCode roast",
      message: error.message,
    });
  }
});

export default router;
