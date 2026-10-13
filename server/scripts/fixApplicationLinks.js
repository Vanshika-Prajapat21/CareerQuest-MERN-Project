// Finds placeholder / invalid application links already stored in MongoDB.
//   npm run fix-links            -> report only (changes nothing)
//   npm run fix-links -- --apply -> clears the bad links so Apply shows "not available yet"
// It never invents a replacement link. Real links must be added by an admin after verification.
require("dotenv").config();
const mongoose = require("mongoose");
const Opportunity = require("../models/Opportunity");
const { getLinkStatus } = require("../utils/url");

const apply = process.argv.includes("--apply");

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const all = await Opportunity.find().lean();
  const report = { valid: [], missing: [], placeholder: [], invalid: [] };

  all.forEach((o) => report[getLinkStatus(o.applicationLink)].push(o));

  console.log(`Checked ${all.length} opportunities`);
  console.log(`  real (valid) links : ${report.valid.length}`);
  console.log(`  no link            : ${report.missing.length}`);
  console.log(`  placeholder links  : ${report.placeholder.length}`);
  console.log(`  invalid links      : ${report.invalid.length}`);

  const bad = [...report.placeholder, ...report.invalid];
  bad.forEach((o) => console.log(`   - ${o.title}  ->  ${o.applicationLink}`));

  if (bad.length && apply) {
    // updateMany on the raw collection: bypasses validators on purpose, we are removing bad data
    const res = await Opportunity.updateMany({ _id: { $in: bad.map((o) => o._id) } }, { $set: { applicationLink: "" } });
    console.log(`Cleared ${res.modifiedCount} bad links.`);
  } else if (bad.length) {
    console.log("Dry run only. Run again with:  npm run fix-links -- --apply");
  }
  process.exit(0);
};

run().catch((e) => { console.error(e); process.exit(1); });
