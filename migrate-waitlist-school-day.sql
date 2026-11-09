-- Adds the "What does a normal school day look like?" answer to the tester waitlist (D1 mdc-waitlist).
-- You don't need to run this: the site adds the column itself the first time someone signs up.
-- Kept so the change is written down. Running it twice gives a harmless "duplicate column" error.
ALTER TABLE waitlist ADD COLUMN school_day TEXT;
