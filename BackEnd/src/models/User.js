const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * User Schema สำหรับจัดเก็บข้อมูลผู้ใช้
 * รองรับการจัดการผู้ใช้แบบ CRUD พร้อม JWT Authentication
 */
const userSchema = new mongoose.Schema(
  {
    // ชื่อผู้ใช้ (ต้องไม่ซ้ำ)
    username: {
      type: String,
      required: [true, 'กรุณากรอกชื่อผู้ใช้'],
      trim: true,
      minlength: [3, 'ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร'],
      maxlength: [30, 'ชื่อผู้ใช้ต้องไม่เกิน 30 ตัวอักษร'],
    },
    // อีเมล (ต้องไม่ซ้ำ)
    email: {
      type: String,
      required: [true, 'กรุณากรอกอีเมล'],
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'กรุณากรอกอีเมลที่ถูกต้อง',
      ],
    },
    // รหัสผ่าน (จะถูก hash ก่อนบันทึก)
    password: {
      type: String,
      required: [true, 'กรุณากรอกรหัสผ่าน'],
      minlength: [6, 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'],
      select: false, // ไม่แสดงรหัสผ่านเมื่อ query
    },
    // ชื่อจริง
    firstName: {
      type: String,
      required: [true, 'กรุณากรอกชื่อจริง'],
      trim: true,
    },
    // นามสกุล
    lastName: {
      type: String,
      required: [true, 'กรุณากรอกนามสกุล'],
      trim: true,
    },
    // บทบาท (user หรือ admin)
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    // สถานะบัญชี
    isActive: {
      type: Boolean,
      default: true,
    },
    // ข้อมูลเพิ่มเติม
    profile: {
      phone: String,
      address: String,
      avatar: String,
    },
  },
  {
    timestamps: true, // เพิ่ม createdAt และ updatedAt อัตโนมัติ
  }
);

// Middleware: Hash รหัสผ่านก่อนบันทึก
userSchema.pre('save', async function (next) {
  // ถ้ารหัสผ่านไม่ได้ถูกแก้ไข ข้ามไป
  if (!this.isModified('password')) {
    return next();
  }

  try {
    // Hash รหัสผ่านด้วย bcrypt
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method: ตรวจสอบรหัสผ่าน
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('ไม่สามารถตรวจสอบรหัสผ่านได้');
  }
};

// Method: แปลง user object เป็น JSON (ไม่รวมข้อมูลที่ละเอียดอ่อน)
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.__v;
  return user;
};

// Index สำหรับเพิ่มประสิทธิภาพการค้นหา (unique indexes)
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ username: 1 }, { unique: true });

const User = mongoose.model('User', userSchema);

module.exports = User;

