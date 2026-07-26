UPDATE "oauth_client"
SET "redirect_uris" = (
  SELECT array_agg(
    replace("uri", '/api/auth/oauth2/callback/', '/api/auth/callback/')
    ORDER BY "position"
  )
  FROM unnest("redirect_uris") WITH ORDINALITY AS "redirect"("uri", "position")
)
WHERE EXISTS (
  SELECT 1
  FROM unnest("redirect_uris") AS "redirect"("uri")
  WHERE "uri" LIKE '%/api/auth/oauth2/callback/%'
);