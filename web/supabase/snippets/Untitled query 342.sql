CREATE OR REPLACE FUNCTION confirm_auth_user(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE auth.users
  SET email_confirmed_at = now()
  WHERE id = user_id AND email_confirmed_at IS NULL;
END;
$$;