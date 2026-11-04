/**
 * Creates (or resets) the Admin account. Admins cannot sign up from the website
 * on purpose, so run this once:
 *
 *   npm run create-admin
 *
 * Optional values in backend/.env:  ADMIN_NAME, ADMIN_PHONE, ADMIN_PASSWORD
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';

const name = process.env.ADMIN_NAME || 'Admin';
const phoneNumber = process.env.ADMIN_PHONE || '9999999999';
const password = process.env.ADMIN_PASSWORD || 'admin123';

if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI is not set in backend/.env');
  process.exit(1);
}

await mongoose.connect(process.env.MONGODB_URI);

let admin = await User.findOne({ phoneNumber });
if (admin) {
  admin.name = name;
  admin.role = 'Admin';
  admin.password = password; // hashed automatically on save
  await admin.save();
  console.log('Existing user updated to Admin.');
} else {
  await User.create({ name, phoneNumber, password, role: 'Admin' });
  console.log('Admin created.');
}

console.log(`Login with phone: ${phoneNumber}  password: ${password}`);
console.log('Change the password after your first login (edit ADMIN_PASSWORD and run again).');
await mongoose.disconnect();
