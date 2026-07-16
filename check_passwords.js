import bcrypt from 'bcryptjs';

const hashes = {
  'admin@yens.com': '$2b$10$uPvvzZHHaTcY3Fs6rS0n5.AwX5OwcaTzBv1xd2z0RicDcqN1yGYqe',
  'testadmin@example.com': '$2b$10$xV570ETtIgb.5P4.sZlXhOP2FnY2DCQp8jcNo80Afe8vVtqkuC8Lq',
  'leonard@lefent.co.uk': '$2b$10$uPukN7VXgh8ANsad1XxdU.5QBkzdLpf9/rAsun2dTvOtWK0vzPfQy'
};

const commonPasswords = [
  'admin',
  'admin123',
  'password',
  'password123',
  'yens123',
  'yensadmin',
  'yensrewards',
  'yensrewards123',
  'yenspos123',
  '123456',
  '12345678',
  'yensthai',
  'yens',
  'pos123',
  'barista123',
  'admin@123',
  'admin@yens',
  'password1234'
];

for (const [email, hash] of Object.entries(hashes)) {
  console.log(`Checking password for ${email}...`);
  let found = false;
  for (const pw of commonPasswords) {
    if (bcrypt.compareSync(pw, hash)) {
      console.log(`  MATCH FOUND: Password for ${email} is "${pw}"`);
      found = true;
      break;
    }
  }
  if (!found) {
    console.log(`  No match found in common passwords list.`);
  }
}
