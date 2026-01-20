/**
 * Generic Transaction Route Handler Factory
 * 
 * Creates GET and POST handlers for transaction routes (expenses/incomes)
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withCompanyAccess } from "./with-company-access";
import { apiResponse } from "./response";
import { logCreate } from "@/lib/audit/logger";
import type { TransactionApiConfig } from "@/types/transaction";

type PrismaModel = 'expense' | 'income';

interface CreateTransactionRoutesOptions extends TransactionApiConfig {
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };
}

/**
 * Creates GET and POST route handlers for transaction resources
 */
export function createTransactionRoutes(config: CreateTransactionRoutesOptions) {
  const {
    model,
    permissions,
    dateField,
    netField,
    notifyFn,
    rateLimit = { maxRequests: 30, windowMs: 60000 },
  } = config;

  const GET = withCompanyAccess(
    async (request, { company }) => {
      const { searchParams } = new URL(request.url);
      const status = searchParams.get("status");
      const page = parseInt(searchParams.get("page") || "1");
      const limit = parseInt(searchParams.get("limit") || "20");

      const where = {
        companyId: company.id,
        ...(status && { status: status as any }),
      };

      const prismaModel = prisma[model as PrismaModel] as any;

      const [items, total] = await Promise.all([
        prismaModel.findMany({
          where,
          include: {
            Contact: true,
            User_Expense_createdByToUser: model === 'expense' ? {
              select: { id: true, name: true, email: true },
            } : undefined,
            User: model === 'income' ? {
              select: { id: true, name: true, email: true },
            } : undefined,
          },
          orderBy: { [dateField]: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prismaModel.count({ where }),
      ]);

      return apiResponse.success({
        [model === 'expense' ? 'expenses' : 'incomes']: items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    },
    { permission: permissions.read }
  );

  const POST = withCompanyAccess(
    async (request, { company, session }) => {
      const body = await request.json();
      const { vatAmount, whtAmount, ...data } = body;
      const netValue = body[netField];

      // Build create data based on model type
      const createData: any = {
        companyId: company.id,
        contactId: data.contactId || null,
        amount: data.amount,
        vatRate: data.vatRate || 0,
        vatAmount: vatAmount || null,
        whtRate: data.whtRate || null,
        whtAmount: whtAmount || null,
        whtType: data.whtType || null,
        [netField]: netValue,
        paymentMethod: data.paymentMethod,
        status: data.status,
        notes: data.notes,
        createdBy: session.user.id,
      };

      // Add model-specific fields
      if (model === 'expense') {
        createData.isWht = data.isWht || false;
        createData.description = data.description;
        createData.category = data.category;
        createData.invoiceNumber = data.invoiceNumber;
        createData.referenceNo = data.referenceNo;
        createData.billDate = data.billDate ? new Date(data.billDate) : new Date();
        createData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
      } else {
        createData.isWhtDeducted = data.isWhtDeducted || false;
        createData.source = data.source;
        createData.invoiceNumber = data.invoiceNumber;
        createData.referenceNo = data.referenceNo;
        createData.receiveDate = data.receiveDate ? new Date(data.receiveDate) : new Date();
      }

      const prismaModel = prisma[model as PrismaModel] as any;

      const item = await prismaModel.create({
        data: createData,
        include: { Contact: true },
      });

      // Create audit log
      await logCreate(
        model === 'expense' ? 'Expense' : 'Income',
        item,
        session.user.id,
        company.id
      );

      // Get base URL from request
      const url = new URL(request.url);
      const baseUrl = `${url.protocol}//${url.host}`;

      // Send LINE notification (non-blocking)
      const notifyData = {
        id: item.id,
        companyCode: company.code,
        companyName: company.name,
        [model === 'expense' ? 'vendorName' : 'customerName']: item.Contact?.name || data.description || data.source || undefined,
        description: data.description || data.source || undefined,
        amount: Number(data.amount),
        vatAmount: vatAmount ? Number(vatAmount) : undefined,
        [model === 'expense' ? 'isWht' : 'isWhtDeducted']: model === 'expense' ? (data.isWht || false) : (data.isWhtDeducted || false),
        whtRate: data.whtRate ? Number(data.whtRate) : undefined,
        whtAmount: whtAmount ? Number(whtAmount) : undefined,
        [netField]: Number(netValue),
        status: data.status,
      };

      notifyFn(company.id, notifyData, baseUrl).catch((error) => {
        console.error(`Failed to send LINE notification for ${model}:`, error);
      });

      return apiResponse.created({ [model]: item });
    },
    {
      permission: permissions.create,
      rateLimit,
    }
  );

  return { GET, POST };
}
