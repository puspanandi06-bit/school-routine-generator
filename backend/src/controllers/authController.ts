import { Request, Response } from 'express';
import prisma from '../config/db';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken } from '../utils/jwt';

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({
    where: { email },
    include: { school: true }
  });

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password'
    });
  }

  const isMatch = await comparePassword(password, user.passwordHash);
  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password'
    });
  }

  const token = generateToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    schoolId: user.schoolId
  });

  // Set HTTP-only secure cookie
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  return res.json({
    success: true,
    message: 'Logged in successfully',
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      school: {
        id: user.school.id,
        name: user.school.name,
        academicYear: user.school.academicYear
      }
    }
  });
}

export async function logout(req: Request, res: Response) {
  res.clearCookie('token');
  return res.json({
    success: true,
    message: 'Logged out successfully'
  });
}

export async function getMe(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    include: { school: true }
  });

  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  return res.json({
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      school: {
        id: user.school.id,
        name: user.school.name,
        code: user.school.code,
        academicYear: user.school.academicYear,
        address: user.school.address,
        phone: user.school.phone,
        email: user.school.email
      }
    }
  });
}

export async function setupInitialAdmin(req: Request, res: Response) {
  const existingUserCount = await prisma.user.count();
  if (existingUserCount > 0) {
    return res.status(400).json({
      success: false,
      message: 'Initial administrator already exists. Setup is locked.'
    });
  }

  const { schoolName, adminName, email, password, academicYear } = req.body;

  const school = await prisma.school.create({
    data: {
      name: schoolName || 'My School',
      academicYear: academicYear || '2025-2026'
    }
  });

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      schoolId: school.id,
      name: adminName,
      email,
      passwordHash,
      role: 'ADMIN'
    }
  });

  const token = generateToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    schoolId: school.id
  });

  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  return res.status(201).json({
    success: true,
    message: 'Initial administrator and school created successfully',
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      school: {
        id: school.id,
        name: school.name,
        academicYear: school.academicYear
      }
    }
  });
}

export async function updateProfile(req: Request, res: Response) {
  const { name, currentPassword, newPassword } = req.body;
  const userId = req.user!.userId;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  const updateData: any = {};
  if (name) updateData.name = name;

  if (newPassword) {
    if (!currentPassword) {
      return res.status(400).json({ success: false, message: 'Current password is required to set new password' });
    }
    const isMatch = await comparePassword(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Incorrect current password' });
    }
    updateData.passwordHash = await hashPassword(newPassword);
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: { id: true, name: true, email: true, role: true }
  });

  return res.json({
    success: true,
    message: 'Profile updated successfully',
    user: updated
  });
}
