import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  const rows = await sql`SELECT id, email, password_hash FROM users WHERE email = 's_miyamoto@greensprout0315.com'`;
  if (rows.length === 0) {
    console.log("User not found");
    return;
  }
  console.log("User found, id:", rows[0].id);
  const match = await bcrypt.compare("KtTAmO6mjpb5hcrc", rows[0].password_hash);
  console.log("Password match:", match);

  if (!match) {
    // パスワードをリセット
    const newHash = await bcrypt.hash("KtTAmO6mjpb5hcrc", 12);
    await sql`UPDATE users SET password_hash = ${newHash} WHERE id = ${rows[0].id}`;
    console.log("Password reset done");
  }
}

main().catch(console.error);
