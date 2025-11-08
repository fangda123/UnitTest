const Joi = require('joi');

/**
 * Middleware สำหรับ validate request body
 * ใช้ Joi สำหรับตรวจสอบข้อมูลที่ส่งมา
 */
const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, {
      abortEarly: false, // แสดง error ทั้งหมด ไม่หยุดที่ error แรก
      stripUnknown: true, // ลบ field ที่ไม่ได้ระบุใน schema
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      return res.status(400).json({
        success: false,
        message: 'ข้อมูลที่ส่งมาไม่ถูกต้อง',
        errors,
      });
    }

    next();
  };
};

// Schema สำหรับการสมัครสมาชิก
const registerSchema = Joi.object({
  username: Joi.string()
    .min(3)
    .max(30)
    .required()
    .messages({
      'string.min': 'ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร',
      'string.max': 'ชื่อผู้ใช้ต้องไม่เกิน 30 ตัวอักษร',
      'any.required': 'กรุณากรอกชื่อผู้ใช้',
    }),
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'กรุณากรอกอีเมลที่ถูกต้อง',
      'any.required': 'กรุณากรอกอีเมล',
    }),
  password: Joi.string()
    .min(6)
    .required()
    .messages({
      'string.min': 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร',
      'any.required': 'กรุณากรอกรหัสผ่าน',
    }),
  firstName: Joi.string()
    .required()
    .messages({
      'any.required': 'กรุณากรอกชื่อจริง',
    }),
  lastName: Joi.string()
    .required()
    .messages({
      'any.required': 'กรุณากรอกนามสกุล',
    }),
  profile: Joi.object({
    phone: Joi.string().allow(''),
    address: Joi.string().allow(''),
    avatar: Joi.string().uri().allow(''),
  }),
});

// Schema สำหรับการเข้าสู่ระบบ
const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'กรุณากรอกอีเมลที่ถูกต้อง',
      'any.required': 'กรุณากรอกอีเมล',
    }),
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'กรุณากรอกรหัสผ่าน',
    }),
});

// Schema สำหรับการอัพเดทข้อมูลผู้ใช้
const updateUserSchema = Joi.object({
  username: Joi.string().min(3).max(30),
  email: Joi.string().email(),
  firstName: Joi.string(),
  lastName: Joi.string(),
  profile: Joi.object({
    phone: Joi.string().allow(''),
    address: Joi.string().allow(''),
    avatar: Joi.string().uri().allow(''),
  }),
});

// Schema สำหรับการเปลี่ยนรหัสผ่าน
const changePasswordSchema = Joi.object({
  currentPassword: Joi.string()
    .required()
    .messages({
      'any.required': 'กรุณากรอกรหัสผ่านปัจจุบัน',
    }),
  newPassword: Joi.string()
    .min(6)
    .required()
    .messages({
      'string.min': 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร',
      'any.required': 'กรุณากรอกรหัสผ่านใหม่',
    }),
});

module.exports = {
  validate,
  registerSchema,
  loginSchema,
  updateUserSchema,
  changePasswordSchema,
};

