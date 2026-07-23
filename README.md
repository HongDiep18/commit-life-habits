Try it now

npm run dev

1. Click "Need an account? Sign up"
2. Your email, a password (6+ characters — Supabase's minimum)
3. You should land straight in the app

Then look at the connection card. It said 0 rows before. It should still say 0 — because your table genuinely is empty — but it's now 0 for a different reason. Prove it: run this in the Supabase SQL Editor:

insert into tracker_object (name) values ('Reading');

Refresh the app while signed in → 1 row. Sign out and back in → still 1. Now the important part: that same query returned 0 before you had a login, with the row already there. Same code, same key, different answer — that's RLS.

Then close the door

Once you're signed up: Aviders → "Allow new users to sign up" → off. Your policy says "any authenticated user," so until you do this, anyone who finds your URL can make an account and read your data.

One editor note

## Your IDE may flag FormEvint from the React 19type definitions, not an error — tsc passes clean and the build works. Safe to ignore.

Next is step 5, the Objects screen — create and list what you track. That's the first real feature, data from the app ratherthan the SQL editor.
