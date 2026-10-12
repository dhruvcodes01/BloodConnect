# BloodConnect: Blood Bank Portal
HTML + CSS + JavaScript front end, Node.js/Express back end, `db.json` as the database.

## Run
1. Install Node.js (v16+).
2. In this folder: `npm install` then `npm start`
3. Open http://localhost:3000

`db.json` is created automatically on first run with demo data (delete it to reset).

## Demo logins
- User: user@demo.com / user123
- Blood bank: city@bank.com / bank123 (also lifecare@bank.com, redcross@bank.com)

## Files
- server.js: REST API and JSON file read/write
- public/*.html: index (search), login, register, dashboard (user), admin (blood bank)
- public/css/style.css, public/js/*.js: styling and page logic
