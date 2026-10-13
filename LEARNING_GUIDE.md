# CareerQuest Learning Guide

Every important line in the code has a simple comment next to it. This guide adds the big ideas for each part of the project, followed by **5 interview questions with answers** per part.

---
## Part 1: Server setup (server.js, config/db.js, middleware/errorHandler.js)
**Big ideas**
- `require("dotenv").config()` loads secrets from `.env` into `process.env`.
- `app.use(express.json())` lets Express read JSON bodies; `cors()` lets React (another port) call the API.
- Routes are plugged in with `app.use("/api/...", router)`. `notFound` and `errorHandler` go last.
- `process.exit(1)` stops the app if the database cannot connect.

**Interview questions**
1. *What is middleware?* A function that runs between request and response with access to `req`, `res`, `next`. Examples: `express.json()`, `cors()`, auth checks.
2. *Why keep secrets in `.env`?* So they never get committed to Git and each environment can use different values.
3. *How does Express recognise an error handler?* It has four parameters `(err, req, res, next)`.
4. *Why must the error handler be registered last?* Middleware runs in order; it must be after all routes to catch their errors.
5. *What is CORS?* A browser rule that blocks calls to another origin unless the server allows it.

---
## Part 2: Mongoose models (models/*.js)
**Big ideas**
- A **schema** describes the shape of a document; a **model** gives you methods like `find` and `create`.
- `required`, `enum`, `unique`, `default` are validation rules.
- `ref: "User"` links a field to another collection; `.populate()` swaps the id for the real document.
- `index({userId, opportunityId}, {unique:true})` stops duplicate saves/applications.
- `select:false` on password hides it from normal queries.

**Interview questions**
1. *Schema vs model?* Schema = structure and rules; model = the class that talks to the collection.
2. *What does `populate` do?* Replaces a stored ObjectId with the referenced document (like a SQL join).
3. *Why a compound unique index on (userId, opportunityId)?* One student can save or apply to an opportunity only once.
4. *Why `select: false` on password?* So the hash is never sent by accident; you must ask for it with `.select("+password")`.
5. *Embedding vs referencing?* Embed small data that is always read together (skills array); reference data that grows or is shared (applications).

---
## Part 3: Authentication (authController, middleware/auth.js, User model hook)
**Big ideas**
- Register: validate, check duplicate email, create user. The **role is never taken from the request**, so nobody can self-register as admin.
- The `pre("save")` hook hashes the password with bcrypt before it reaches the database.
- Login: find user, `bcrypt.compare`, then return a **JWT** that contains only the user id.
- `protect` verifies the token and sets `req.user`. `adminOnly` checks `req.user.role`. `optionalAuth` lets visitors in but still identifies students.

**Interview questions**
1. *Why hash passwords instead of encrypting them?* Hashing is one-way; even if the database leaks, passwords cannot be read back.
2. *What is a salt (the `10` in bcrypt)?* Random data added before hashing so identical passwords give different hashes; 10 is the cost (rounds).
3. *What is a JWT and what does it contain?* A signed token with header, payload (our user id) and signature. Anyone can read it, but only the server can sign it.
4. *Is logout meaningful with JWT?* The token is stateless, so the client deletes it. For instant revocation you need a blacklist or short expiry plus refresh tokens.
5. *Authentication vs authorization?* Authentication proves who you are (login). Authorization decides what you may do (role check).

---
## Part 4: Opportunity APIs (opportunityController, opportunityRoutes)
**Big ideas**
- The list endpoint builds a `filter` object step by step from query params (type, mode, skills, location, search).
- `escapeRegex` makes user search text safe inside a RegExp.
- `expireOldOpportunities` flips past-deadline items to `expired`.
- Route order matters: `/meta/filters` is above `/:id`, otherwise "meta" would be read as an id.
- Admin routes use `protect, adminOnly`. Deleting an opportunity also deletes saves, applications and reports.

**Interview questions**
1. *Query params vs route params?* Route params identify a resource (`/:id`); query params filter or sort (`?type=Job`).
2. *Why escape regex input?* A user typing `.*` or `(` could break the query or cause slow regex (ReDoS).
3. *Why does route order matter in Express?* The first matching route wins.
4. *Where would you add indexes?* On `status`, `deadline`, `type` and a text index on title/description for faster search.
5. *Offset pagination weakness?* Large offsets get slow and results can shift when data changes; cursor pagination is better at scale.

---
## Part 5: Recommendation algorithm (utils/matching.js, recommendationController)
**Big ideas**
- Five rules add up to 100: skills 40, interests 25, education 15, location 10, type preference 10.
- Skills = matched required skills ÷ total required skills × 40.
- Online or remote opportunities fully match location; "Any" education matches everyone.
- The function also returns a `breakdown`, so the details page can explain *why*.
- Scores are calculated on the fly, so they are always up to date.

**Interview questions**
1. *Rule-based vs ML recommendations?* Rules are simple, explainable and need no data. ML can learn from behaviour but needs lots of data.
2. *Why compute on the fly instead of storing scores?* Profiles and opportunities change often; stored scores would go stale and need recalculation.
3. *How would you scale this for 1 million opportunities?* Pre-filter in MongoDB (active, skill overlap), cache scores, or compute in batches/background jobs.
4. *How would you add a new rule such as "deadline urgency"?* Add a weight, a score function, rebalance weights to total 100, and include it in the breakdown.
5. *What is cold start and how do you handle it?* A new user has no profile data, so we give half marks for unset preferences and ask them to complete the profile.

---
## Part 6: Saved, Applications, Notifications, Admin APIs
**Big ideas**
- Saving uses `updateOne(..., {upsert:true})`: create if missing, otherwise do nothing.
- `findOneAndUpdate({_id, userId})` makes sure students can only edit their **own** applications.
- Deadline notifications are created once per saved opportunity closing within 3 days (the code checks for an existing one).
- Admin stats use `aggregate` with `$group`, `$sort`, `$limit` and `Promise.all` to run queries in parallel.

**Interview questions**
1. *What is an upsert?* Update if it exists, insert if it does not, in one operation.
2. *How do you stop one user editing another user's data?* Always include the logged-in `userId` in the query filter (ownership check).
3. *Why `Promise.all`?* Independent queries run at the same time instead of one after another, so the response is faster.
4. *What does `$group` do?* Groups documents by a field and calculates values such as counts, like SQL `GROUP BY`.
5. *How would you send deadline reminders without the user opening the app?* Run a scheduled job (node-cron) and send email with Nodemailer.

---
## Part 7: React foundation (main.jsx, App.jsx, AuthContext, services, ProtectedRoute, useFetch)
**Big ideas**
- `BrowserRouter` enables routing; `Routes`/`Route` map URLs to pages; `<Outlet />` shows the child page inside a layout.
- **Context** (`AuthContext`) shares the logged-in user with every component without passing props.
- On app start we call `/auth/me` if a token exists, so refresh keeps you logged in.
- An Axios **interceptor** adds the `Authorization` header to every request.
- `ProtectedRoute` redirects visitors to login and users with the wrong role to their own dashboard.
- `useFetch` is a custom hook that gives `{data, loading, error, reload}` for any API call.

**Interview questions**
1. *Why Context instead of props?* Avoids "prop drilling"; any component can read auth state directly.
2. *What does `useEffect` with `[]` do?* Runs once after the first render, like "on mount".
3. *Where do you store the JWT and what are the risks?* We use localStorage (simple, but readable by XSS). httpOnly cookies are safer.
4. *What is an Axios interceptor?* Code that runs on every request/response, here to attach the token.
5. *Are frontend route guards real security?* No. They only improve UX. The server's `protect` and `adminOnly` are the real protection.

---
## Part 8: Home page (Home.jsx, Navbar, Footer, PublicLayout)
**Big ideas**
- The hero search form uses `navigate("/explore?q=...")` to pass the search to the Explore page.
- Category cards are links such as `/explore?type=Internship`.
- Featured items come from `GET /opportunities?featured=true&limit=6`.
- `PublicLayout` wraps pages with Navbar + Footer; the mobile menu is a simple `open` state.

**Interview questions**
1. *Controlled vs uncontrolled input?* Controlled inputs store their value in state (`value` + `onChange`).
2. *Why `e.preventDefault()` in a form submit?* To stop the browser reloading the page.
3. *`Link` vs `<a>`?* `Link` changes the URL without a full page reload.
4. *What does `encodeURIComponent` do?* Makes text safe to put in a URL (spaces, `&`, etc.).
5. *How is the layout made responsive?* CSS grid with `auto-fill/minmax` plus media queries for small screens.

---
## Part 9: Explore page (Explore.jsx, OpportunityCard, MatchBadge)
**Big ideas**
- All filters live in one `filters` state object; one `change` handler updates any field using `e.target.name`.
- `useEffect` re-fetches when `filters` or `page` change. A 300 ms `setTimeout` is **debouncing**; the cleanup `clearTimeout` cancels the old timer.
- Filter dropdown options come from `/opportunities/meta/filters`.
- The card keeps its own `saved` state and calls the API to toggle it.

**Interview questions**
1. *What is debouncing and why use it?* Waiting until the user stops typing before calling the API, to avoid many unnecessary requests.
2. *What does the `useEffect` cleanup function do?* Runs before the next effect or on unmount; here it cancels the pending timer.
3. *Why reset page to 1 when a filter changes?* The old page number may not exist for the new result set.
4. *What are `key` props for?* They help React identify list items so it updates efficiently and correctly.
5. *Lifting state up?* Moving shared state to a parent. Here `onSavedChange` lets the Saved page react when a card is un-saved.

---
## Part 10: Opportunity details page (OpportunityDetails.jsx)
**Big ideas**
- `useParams()` reads `:id` from the URL; `useFetch` reloads when the id or user changes.
- "Apply Now" opens the real link in a new tab (`noopener` for safety) and records status **Applied**.
- The match panel loops over `breakdown` and draws progress bars from `score / max`.
- Guards (`requireStudent`) show a toast and redirect when a visitor tries to save or report.

**Interview questions**
1. *Why `rel/noopener` with new tabs?* It stops the opened page from controlling `window.opener` (security).
2. *How do you handle loading and error states?* Return early with a loader or error message before rendering the data.
3. *Why include `user?._id` in the dependency array?* So the page refetches (and shows the match) right after login.
4. *What is optional chaining `?.`?* Safely reads a property without crashing when the parent is null/undefined.
5. *How do you avoid duplicate application records?* The server uses upsert plus a unique index.

---
## Part 11: Student pages (Dashboard, Recommended, Saved, MyApplications, Notifications, Profile, Settings)
**Big ideas**
- Dashboard: one API call `/users/dashboard` returns stats, top 3 picks and upcoming deadlines.
- Recommended: filter tabs change `min` and `useFetch` runs again.
- Applications: the status `<select>` updates the server, then updates local state with `map`.
- Profile: skills/interests are typed as comma-separated text; the server converts them to arrays. Updating the profile changes the match scores immediately.
- Settings: client-side checks first, then the API verifies the current password.

**Interview questions**
1. *How do you update one item in a state array immutably?* `list.map(x => x.id === id ? {...x, changed} : x)`.
2. *Why validate on both client and server?* Client validation is for fast feedback; server validation is the real protection.
3. *Why not store arrays directly in text inputs?* Inputs hold strings, so we join for display and split on submit.
4. *What is a toast?* A small non-blocking message that confirms success or shows an error.
5. *Why one dashboard endpoint instead of four?* Fewer network round trips and faster page load.

---
## Part 12: Admin pages (AdminDashboard, ManageOpportunities, OpportunityForm, ManageUsers, ManageCategories, Reports)
**Big ideas**
- The dashboard bar chart is built with plain divs whose `width` is a percentage of the largest value.
- `OpportunityForm` is reused for Add and Edit: `useParams` gives an `id` only in edit mode.
- Dates: the server stores a full date; the form uses `.slice(0, 10)` to fit `<input type="date">`.
- Admins cannot change or delete their own account (checked on server and UI).
- Destructive actions ask `window.confirm` first.

**Interview questions**
1. *How do you reuse one form for create and update?* Detect the `id` param; load existing data and call `update` or `create` accordingly.
2. *Why block admins from deleting themselves on the server too?* The UI can be bypassed with direct API calls.
3. *Why is the role check done on the server for admin APIs?* Client code can be edited by the user; only server checks are trustworthy.
4. *How would you add real charts?* Use a library such as Recharts and pass it the same aggregated data.
5. *What happens to related data when an opportunity is deleted?* We delete saves, applications, reports and notifications to avoid orphan records (cascading cleanup).

---
## Part 13: Safe application links (utils/url.js, Opportunity model, OpportunityDetails)
**Big ideas**
- `new URL(text)` parses a link and throws if it is not valid; `url.protocol` must be `http:` or `https:` so `javascript:` and `data:` links are blocked.
- Placeholder domains such as example.com are reserved for documentation, so they can never be a real application page.
- The link is optional in the model; `withSafeLink` blanks any bad stored link and adds `hasApplyLink` before data leaves the API.
- The button checks the link again with `getSafeApplyUrl` right before `window.open(url, "_blank", "noopener,noreferrer")`.
- Save and Track use the opportunity id only, so they work even when no link exists.

**Interview questions**
1. *Why validate a URL on both client and server?* The server is the real protection (the client can be bypassed); the client gives instant feedback and a second safety check.
2. *What attack does blocking `javascript:` and `data:` links prevent?* A stored link could run script in the user's browser when clicked (XSS). Allowing only http/https prevents it.
3. *What does `rel="noopener noreferrer"` / the `noopener` window feature do?* It stops the new page from accessing `window.opener` and hides the referrer.
4. *Why is `https://trusted.com@evil.com` dangerous?* The text before `@` is treated as a username, so the real host is `evil.com`; we reject URLs containing credentials.
5. *Why not just hide the broken button?* The root cause was bad data. We fixed the data, made the field optional and validated, and added output sanitising so old bad records are also harmless.

---
## Part 14: Apply Now, internal application form and resume upload
**Big ideas**
- `getApplyAction()` is a pure function that decides the button: already applied, closed, login, external (valid URL), or internal form. Keeping decisions out of React makes them easy to test.
- The external flow opens `window.open(url, "_blank", "noopener,noreferrer")` right inside the click so browsers do not block the popup. It records only "Interested", because CareerQuest cannot know whether the student really submitted on another site.
- The form is sent as `multipart/form-data` (`FormData`). On the server, **multer** reads the file into memory; we then check size, `.pdf`, mime type **and the real first bytes (`%PDF-`)** before saving it under a random file name.
- The owner of an application is always `req.user._id` from the login token. Fields like `userId` or `status` in the request body are ignored.
- A unique index on `(userId, opportunityId)` stops duplicates even if the student double-clicks. If it fires, we delete the file we just saved.
- Resumes are not in a public folder. They are streamed by an endpoint that checks ownership (or admin role).

**Interview questions**
1. *Why never trust `userId` from the request body?* Anyone can send any value; identity must come from the verified token (`req.user`), otherwise one user could apply as another (an IDOR / mass-assignment flaw).
2. *Why check the file's first bytes instead of just the extension or MIME type?* Both are chosen by the client and can be faked. The "magic bytes" show what the file really is (PDFs start with `%PDF-`).
3. *Why store uploads with random names outside the public folder?* A user file name could contain `../` or overwrite files, and a public folder would let anyone download resumes by guessing a URL.
4. *How do you prevent duplicate submissions?* Check first for a friendly 409 message, and also keep a unique compound index so the database rejects a race condition. Then handle the error (409) and clean up any saved file.
5. *Why is `window.open` called straight from the click handler?* Browsers only allow popups started by a direct user action; if you open it after an `await`, it may be blocked.
