/**
 * LINE Configuration
 * 
 * Functions for retrieving LINE configuration from database.
 */

import { prisma } from "@/lib/db";
import { createLogger } from "@/lib/utils/logger";
import { mergeSettings, type LineNotifySettings } from "./settings";
import type { CompanyLineConfig } from "./line-types";

const log = createLogger("line-config");

/**
 * Get LINE configuration for a company from database
 */
export async function getCompanyLineConfig(
  companyId: string,
  checkEnabled: boolean = true
): Promise<CompanyLineConfig | null> {
  try {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        lineChannelAccessToken: true,
        lineGroupId: true,
        lineNotifyEnabled: true,
        lineNotifySettings: true,
      },
    });

    if (!company) {
      log.debug(`Company ${companyId} not found`);
      return null;
    }

    if (!company.lineChannelAccessToken) {
      log.debug(`Company ${companyId} missing lineChannelAccessToken`);
      return null;
    }

    if (!company.lineGroupId) {
      log.debug(`Company ${companyId} missing lineGroupId`);
      return null;
    }

    // Check if notifications are enabled (unless bypassed)
    if (checkEnabled && !company.lineNotifyEnabled) {
      log.debug(`Notifications disabled for company ${companyId}`);
      return null;
    }

    return {
      channelAccessToken: company.lineChannelAccessToken,
      groupId: company.lineGroupId,
      notifyEnabled: company.lineNotifyEnabled,
      notifySettings: mergeSettings(company.lineNotifySettings as Partial<LineNotifySettings> | null),
    };
  } catch (error) {
    log.error("getCompanyLineConfig failed", error, { companyId });
    return null;
  }
}

/**
 * Get LINE configuration by company code
 */
export async function getCompanyLineConfigByCode(
  companyCode: string,
  checkEnabled: boolean = true
): Promise<CompanyLineConfig | null> {
  try {
    const company = await prisma.company.findUnique({
      where: { code: companyCode.toUpperCase() },
      select: {
        lineChannelAccessToken: true,
        lineGroupId: true,
        lineNotifyEnabled: true,
        lineNotifySettings: true,
      },
    });

    if (
      !company?.lineChannelAccessToken ||
      !company?.lineGroupId
    ) {
      return null;
    }

    // Check if notifications are enabled (unless bypassed)
    if (checkEnabled && !company.lineNotifyEnabled) {
      log.debug(`LINE notifications disabled for company code ${companyCode}`);
      return null;
    }

    return {
      channelAccessToken: company.lineChannelAccessToken,
      groupId: company.lineGroupId,
      notifyEnabled: company.lineNotifyEnabled,
      notifySettings: mergeSettings(company.lineNotifySettings as Partial<LineNotifySettings> | null),
    };
  } catch (error) {
    log.error("Failed to get LINE config", error, { companyCode });
    return null;
  }
}
