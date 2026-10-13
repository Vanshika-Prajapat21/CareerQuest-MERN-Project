export default function About() {
  return (
    <div className="container narrow section">
      <h1>About CareerQuest</h1>
      <p>CareerQuest helps students find the right opportunity without searching ten different websites. Internships, jobs, hackathons, coding competitions, scholarships, workshops, certifications and college events live in one place.</p>
      <h2>How we match you</h2>
      <p>Every opportunity gets a score from 0 to 100 based on a simple, transparent rule set:</p>
      <ul>
        <li><strong>Skills</strong> (40%): how many required skills you already have</li>
        <li><strong>Interests</strong> (25%): does it match what you enjoy</li>
        <li><strong>Education</strong> (15%): are you eligible</li>
        <li><strong>Location</strong> (10%): online, remote or in your city</li>
        <li><strong>Preferred type</strong> (10%): internship, hackathon and so on</li>
      </ul>
      <p>You always see the reasons behind a score, so there is no black box.</p>
    </div>
  );
}
