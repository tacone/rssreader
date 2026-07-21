import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!);

const result = await sql`
  SELECT f.slug, f.title,
    (SELECT count(*)::int FROM items WHERE feed_id = f.id AND is_read = false) as unread,
    (SELECT count(*)::int FROM items WHERE feed_id = f.id AND is_read = true) as read,
    (SELECT count(*)::int FROM items WHERE feed_id = f.id) as total
  FROM feeds f
  ORDER BY lower(f.title)
`;

for (const r of result) {
  console.log(r.slug, '| unread:', JSON.stringify(r.unread), '| read:', JSON.stringify(r.read), '| total:', JSON.stringify(r.total));
}

await sql.end();
