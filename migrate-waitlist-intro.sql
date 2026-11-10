-- Adds the optional "a few more questions" answers to the tester waitlist (D1 mdc-waitlist).
-- You don't need to run this: the site adds the column itself the first time someone answers.
-- Kept so the change is written down. Running it twice gives a harmless "duplicate column" error.
ALTER TABLE waitlist ADD COLUMN intro TEXT;
