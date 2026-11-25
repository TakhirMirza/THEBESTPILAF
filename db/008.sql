BEGIN;
CREATE TABLE finance_expenses(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), incurred_on date NOT NULL, category text NOT NULL CHECK(category IN ('labor','packaging','utilities','freight','rent','marketing','other')), amount_cents bigint NOT NULL CHECK(amount_cents BETWEEN 1 AND 100000000000), description text NOT NULL CHECK(length(description) BETWEEN 1 AND 500), created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX finance_expenses_date_idx ON finance_expenses(incurred_on);
COMMIT;
