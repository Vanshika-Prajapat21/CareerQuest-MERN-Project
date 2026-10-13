# CareerQuest

A student-focused opportunity discovery and tracking platform built with the MERN stack.
Its main feature is **personalized recommendations**: every opportunity gets a 0-100 match score based on the student's skills, interests, education, location and preferred opportunity type.

## Features
**Students:** register/login, profile (education, skills, interests, location, preferred types), browse/search/filter opportunities, match percentage with explanation, save/bookmark, apply via official link, track applications (Interested → Applied → Shortlisted → Rejected/Selected), recommendations, notifications (new matches, deadline reminders), upcoming deadlines, change password.

**Admin:** dashboard statistics and charts, add/edit/delete opportunities, mark as expired, manage users and roles, manage categories, view reported opportunities.

## Tech stack
React 18 (Vite), React Router, Axios, react-hot-toast, plain responsive CSS · Node.js, Express, JWT, bcryptjs · MongoDB + Mongoose.

## Folder structure
```
careerquest/
├── package.json            (run both apps with one command)
├── LEARNING_GUIDE.md       (line-by-line ideas + interview questions)
├── server/
│   ├── config/db.js
│   ├── controllers/        (auth, opportunity, user, saved, application, recommendation, notification, category, admin)
│   ├── middleware/         (auth.js, errorHandler.js)
│   ├── models/             (User, Opportunity, Application, SavedOpportunity, Notification, Category, Report)
│   ├── routes/
│   ├── utils/              (matching.js = recommendation algorithm)
│   ├── seed.js             (sample data + first admin)
│   └── server.js
└── client/
    └── src/
        ├── components/  context/  hooks/  services/  utils/
        └── pages/ (public) · pages/student · pages/admin
```

## Installation
Requirements: Node.js 18+ and MongoDB (local, or a free MongoDB Atlas cluster).

```bash
# 1. from the careerquest folder
npm install                      # installs "concurrently" for the dev command
npm install --prefix server
npm install --prefix client

# 2. create the server environment file
cp server/.env.example server/.env        # Windows: copy server\.env.example server\.env
# open server/.env and set JWT_SECRET (any long random text), and ADMIN_PASSWORD

# 3. add sample data + the admin account
npm run seed
```

## Environment variables (`server/.env`)
| Name | Purpose |
|---|---|
| PORT | API port (default 5000) |
| MONGO_URI | MongoDB connection string |
| JWT_SECRET | Secret used to sign login tokens (keep private) |
| JWT_EXPIRES_IN | Token lifetime, e.g. 7d |
| CLIENT_URL | Allowed frontend origin (CORS), e.g. http://localhost:5173 |
| ADMIN_EMAIL / ADMIN_PASSWORD | Used only by `npm run seed` to create the admin |
| UPLOAD_DIR, MAX_RESUME_MB | Where resumes are stored (default server/uploads/resumes) and the max resume size in MB (default 2) |
| CLOUDINARY_*, EMAIL_* | Optional, not used yet (see Future enhancements) |

`client/.env` (optional): `VITE_API_URL` if the API is hosted elsewhere.

## How to run
```bash
npm run dev          # starts API on :5000 and React on :5173 together
```
Or in two terminals: `cd server && npm run dev` and `cd client && npm run dev`.
Open http://localhost:5173. Log in as the admin with the email/password from your `.env`, or register a student.

Quick test of the match score: register as a student with skills `React, JavaScript, Node.js`, interest `Web Development`, education `MCA`, location `Indore`. Open "Recommended For You".

## Recommendation scoring
Skills 40 + Interests 25 + Education 15 + Location 10 + Preferred type 10 = 100.
Labels: 90-100 Excellent Match · 75-89 Good Match · 60-74 Relevant · below 60 Explore.
Code: `server/utils/matching.js`. Scores are calculated on the fly, so they update as soon as a profile changes.

## API endpoints
| Method | Endpoint | Access |
|---|---|---|
| POST | /api/auth/register, /api/auth/login, /api/auth/logout | public |
| GET | /api/auth/me | logged in |
| GET | /api/opportunities (q, type, skills, location, mode, organization, deadline, sort, page, limit) | public (adds match for students) |
| GET | /api/opportunities/:id, /api/opportunities/meta/filters | public |
| POST | /api/opportunities | admin |
| PUT | /api/opportunities/:id, /api/opportunities/:id/expire | admin |
| DELETE | /api/opportunities/:id | admin |
| POST | /api/opportunities/:id/report | student |
| GET / PUT | /api/users/profile | logged in |
| PUT | /api/users/password | logged in |
| GET | /api/users/dashboard | logged in |
| POST / DELETE | /api/saved/:opportunityId | student |
| GET | /api/saved | student |
| POST | /api/applications/:opportunityId (track an external application) | student |
| POST | /api/applications/:opportunityId/internal (multipart form + resume PDF) | student |
| GET | /api/applications/:id, /api/applications/:id/resume | student (owner) |
| GET | /api/applications | student |
| PUT / DELETE | /api/applications/:id | student |
| GET | /api/recommendations?min=&limit= | student |
| GET | /api/notifications | logged in |
| PUT | /api/notifications/:id/read, /api/notifications/read-all | logged in |
| GET | /api/categories | public |
| POST / DELETE | /api/categories(/:id) | admin |
| GET | /api/admin/stats, /users, /reports | admin |
| GET | /api/admin/applications, /applications/:id, /applications/:id/resume | admin |
| PUT | /api/admin/applications/:id/status | admin |
| PUT | /api/admin/users/:id/role, /api/admin/reports/:id | admin |
| DELETE | /api/admin/users/:id, /api/admin/reports/:id | admin |

## Applying to opportunities
Every opportunity has an active **Apply Now** button (except when the deadline has passed, then it shows "Applications closed"):

- **Valid official URL** (a real `http(s)` link set by an admin): a dialog explains you are leaving CareerQuest, then the official site opens in a **new tab**. CareerQuest only records the opportunity as **Interested** in My Applications. It never marks it as submitted, because it cannot know. The student uses **Mark as Applied** themselves.
- **No valid URL**: a reusable **CareerQuest application form** opens (name, email, phone, college, education, year/semester, city/state, skills, PDF resume, optional LinkedIn and GitHub/portfolio, "why do you want to apply", optional experience). It is saved in MongoDB, the owner is taken from the login token, and a second application to the same opportunity shows **Already Applied** with a link to the existing application.
- Placeholder or unsafe links (example.com, localhost, `javascript:`, `data:`, `ftp:`...) are rejected by the model, the admin form, the API output and the button itself. They are treated as "no link", so the CareerQuest form is used.
- The 20 sample opportunities are fictional demo data and have **no official URL**, so they all use the CareerQuest form. To demo the official-website flow, an admin edits one opportunity and enters a real, verified URL (Admin > Edit Opportunity), or you add it to `VERIFIED_LINKS` in `server/seed.js`.
- Resumes are stored in `server/uploads/resumes/` with random file names (folder is git-ignored) and are only served through authenticated endpoints to the owner or an admin.
- Admins review internal applications at **Admin > Applications** and set the status to Shortlisted, Rejected or Selected (or back to Applied). The student gets a notification.
- Already seeded with the old version? Run `npm run fix-links` (report only), then `npm run fix-links -- --apply`, or just `npm run seed` again.

### Tests
```bash
cd server
npm test        # 28 tests, needs no database, browser or network
```
They run the real controllers, middleware, route wiring and validators against an in-memory fake of the database. They do **not** talk to a real MongoDB, run multer, or click buttons in a browser. Please try the flows once manually (see the checklist in the chat reply or below).

Manual check: (1) as a student open any sample opportunity > Apply Now > fill the form with a small PDF > submit > see it in My Applications; (2) open it again and see "Already Applied"; (3) as admin open Applications, view the applicant, download the resume, set Shortlisted; (4) as admin edit another opportunity, set a real official URL, then as a student click Apply Now and confirm the dialog and new tab.

## Future enhancements
Store resumes in cloud storage (S3/Cloudinary) with virus scanning, email the student when an admin changes a status, let students withdraw an internal application, Cloudinary image/logo upload, Nodemailer email alerts for deadlines, a scheduled job (node-cron) to send reminders, server-side pagination at scale, MongoDB text indexes for faster search, refresh tokens/httpOnly cookies, unit tests (Jest + Supertest), TF-IDF or ML-based recommendations, and a calendar view of deadlines.
