const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: require('path').resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;
const adminEmail = 'admin@tech.com';

const adminSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  avatar: String,
  isApproved: Boolean,
  isPrimary: Boolean,
}, { timestamps: true });

const Admin = mongoose.model('Admin', adminSchema);

async function cleanupAndSeedPrimaryAdmin() {
  await mongoose.connect(MONGODB_URI);
  // Remove all admin@tech.com accounts
  await Admin.deleteMany({ email: adminEmail });
  // Create the primary admin
  const bcrypt = require('bcryptjs');
  const hashedPassword = await bcrypt.hash('admin123', 12);
  await Admin.create({
    name: 'System Administrator',
    email: adminEmail,
    password: hashedPassword,
    isApproved: true,
    isPrimary: true,
  });
  console.log('✅ Cleaned and seeded primary admin:', adminEmail);
  await mongoose.disconnect();
}

cleanupAndSeedPrimaryAdmin().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
