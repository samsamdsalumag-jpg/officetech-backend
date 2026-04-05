const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const Category = require('../models/Category');

const defaultCategories = [
  { name: 'Computers & Laptops', color: '#3B82F6' },
  { name: 'Networking Equipment', color: '#8B5CF6' },
  { name: 'Printers & Scanners', color: '#10B981' },
  { name: 'Audio/Video Equipment', color: '#F59E0B' },
  { name: 'Cables & Accessories', color: '#EF4444' },
  { name: 'Tools', color: '#6B7280' },
  { name: 'Spare Parts', color: '#EC4899' },
  { name: 'Furniture', color: '#14B8A6' },
];

module.exports = async function seed() {
  try {
    // Create admin if not exists
    const adminExists = await Admin.findOne({ email: 'admin@tech.com' });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 12);
      await Admin.create({
        name: 'System Administrator',
        email: 'admin@tech.com',
        password: hashedPassword,
        isApproved: true,
        isPrimary: true,
      });
      console.log('✅ Primary admin seeded: admin@tech.com / admin123');
    }

    // Create default categories
    for (const cat of defaultCategories) {
      await Category.findOneAndUpdate(
        { name: cat.name },
        { $setOnInsert: cat },
        { upsert: true, new: true }
      );
    }
    console.log('✅ Default categories seeded');
  } catch (err) {
    console.error('Seed error:', err.message);
  }
};
