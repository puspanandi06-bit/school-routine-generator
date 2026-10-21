import { Request, Response } from 'express';
import prisma from '../config/db';

export async function getSchool(req: Request, res: Response) {
  const schoolId = req.user!.schoolId;
  const school = await prisma.school.findUnique({
    where: { id: schoolId }
  });

  if (!school) {
    return res.status(404).json({ success: false, message: 'School not found' });
  }

  return res.json({ success: true, school });
}

export async function updateSchool(req: Request, res: Response) {
  const schoolId = req.user!.schoolId;
  const { name, code, address, phone, email, academicYear } = req.body;

  const school = await prisma.school.update({
    where: { id: schoolId },
    data: {
      name,
      code,
      address,
      phone,
      email,
      academicYear
    }
  });

  return res.json({
    success: true,
    message: 'School settings updated successfully',
    school
  });
}
