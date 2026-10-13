// Simple rule-based matching (no AI). Total = 100 points.
const WEIGHTS = { skills: 40, interests: 25, education: 15, location: 10, type: 10 };

const lower = (arr = []) => arr.map((s) => String(s).trim().toLowerCase()).filter(Boolean);

const getLabel = (score) => {
  if (score >= 90) return "Excellent Match";
  if (score >= 75) return "Good Match";
  if (score >= 60) return "Relevant";
  return "Explore";
};

const calculateMatch = (user, opp) => {
  // 1) SKILLS (40): what share of the required skills does the student have?
  const userSkills = lower(user.skills);
  const oppSkills = lower(opp.skills);
  const matchedSkills = oppSkills.filter((s) => userSkills.includes(s));
  const skillScore = oppSkills.length
    ? (matchedSkills.length / oppSkills.length) * WEIGHTS.skills
    : WEIGHTS.skills / 2; // no skills listed -> half marks

  // 2) INTERESTS (25): does an interest appear in the title/category/skills?
  const interests = lower(user.interests);
  const text = `${opp.title} ${opp.category} ${oppSkills.join(" ")}`.toLowerCase();
  const matchedInterests = interests.filter((i) => text.includes(i));
  const interestScore = interests.length
    ? Math.min(1, matchedInterests.length / Math.min(interests.length, 2)) * WEIGHTS.interests
    : 0;

  // 3) EDUCATION (15): "Any" or empty means everyone is eligible
  const oppEdu = lower(opp.education);
  const userEdu = String(user.education || "").trim().toLowerCase();
  const eduOpen = oppEdu.length === 0 || oppEdu.includes("any");
  const eduMatch = eduOpen || (userEdu && oppEdu.some((e) => e.includes(userEdu) || userEdu.includes(e)));
  const educationScore = eduMatch ? WEIGHTS.education : 0;

  // 4) LOCATION (10): online / remote works for everyone, else same city
  const userLoc = String(user.location || "").trim().toLowerCase();
  const oppLoc = String(opp.location || "").trim().toLowerCase();
  const locMatch =
    opp.mode === "Online" || oppLoc === "remote" ||
    (userLoc && oppLoc && (oppLoc.includes(userLoc) || userLoc.includes(oppLoc)));
  const locationScore = locMatch ? WEIGHTS.location : 0;

  // 5) TYPE PREFERENCE (10): no preference set -> half marks
  const prefs = lower(user.preferredTypes);
  const typeMatch = prefs.includes(String(opp.type).toLowerCase());
  const typeScore = prefs.length ? (typeMatch ? WEIGHTS.type : 0) : WEIGHTS.type / 2;

  const score = Math.round(skillScore + interestScore + educationScore + locationScore + typeScore);

  return {
    score,
    label: getLabel(score),
    breakdown: {
      skills: { score: Math.round(skillScore), max: WEIGHTS.skills, matched: matchedSkills, missing: oppSkills.filter((s) => !userSkills.includes(s)) },
      interests: { score: Math.round(interestScore), max: WEIGHTS.interests, matched: matchedInterests },
      education: { score: educationScore, max: WEIGHTS.education, matched: Boolean(eduMatch) },
      location: { score: locationScore, max: WEIGHTS.location, matched: Boolean(locMatch) },
      type: { score: Math.round(typeScore), max: WEIGHTS.type, matched: prefs.length ? typeMatch : null },
    },
  };
};

module.exports = { calculateMatch, getLabel, WEIGHTS };
